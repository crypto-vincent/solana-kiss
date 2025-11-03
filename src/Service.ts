import { BlockHash } from "./data/Block";
import { Instruction } from "./data/Instruction";
import { JsonValue } from "./data/Json";
import { Pubkey } from "./data/Pubkey";
import { Signer } from "./data/Signer";
import { transactionCompileAndSign } from "./data/Transaction";
import { withErrorContext } from "./data/Utils";
import { WalletAccount } from "./data/Wallet";
import { idlAccountDecode } from "./idl/IdlAccount";
import {
  idlInstructionDecode,
  idlInstructionEncode,
} from "./idl/IdlInstruction";
import { idlInstructionAccountFind } from "./idl/IdlInstructionAccount";
import {
  IdlLoader,
  idlLoaderFallbackToUnknown,
  idlLoaderFromOnchain,
  idlLoaderFromUrl,
} from "./idl/IdlLoader";
import {
  IdlProgram,
  idlProgramGuessAccount,
  idlProgramGuessInstruction,
} from "./idl/IdlProgram";
import { IdlTypeFull } from "./idl/IdlTypeFull";
import { RpcHttp } from "./rpc/RpcHttp";
import { rpcHttpGetAccountWithData } from "./rpc/RpcHttpGetAccountWithData";
import { rpcHttpGetLatestBlockHash } from "./rpc/RpcHttpGetLatestBlockHash";
import { rpcHttpSendTransaction } from "./rpc/RpcHttpSendTransaction";

export class Service {
  private readonly rpcHttp: RpcHttp;
  private readonly idlLoaders: Array<IdlLoader>;
  private readonly idlOverrides: Map<Pubkey, IdlProgram>;
  private recentBlockHash: { hash: BlockHash; timeMs: number } | null;

  constructor(
    rpcHttp: RpcHttp,
    options?: {
      customIdlLoaders?: Array<IdlLoader>;
      customIdlOverrides?: Map<Pubkey, IdlProgram>;
    },
  ) {
    this.rpcHttp = rpcHttp;
    this.idlLoaders = options?.customIdlLoaders ?? standardLoaders(rpcHttp);
    this.idlOverrides = options?.customIdlOverrides ?? new Map();
    this.recentBlockHash = null;
  }

  public setProgramIdl(
    programAddress: Pubkey,
    programIdl: IdlProgram | undefined,
  ) {
    if (programIdl === undefined) {
      this.idlOverrides.delete(programAddress);
    } else {
      this.idlOverrides.set(programAddress, programIdl);
    }
  }

  public async getOrLoadProgramIdl(programAddress: Pubkey) {
    const overrideIdl = this.idlOverrides.get(programAddress);
    if (overrideIdl) {
      return overrideIdl;
    }
    for (const idlLoader of this.idlLoaders) {
      try {
        return await idlLoader(programAddress);
      } catch (error) {
        // TODO (error) - log error stack ?
      }
    }
    throw new Error(`IDL not found for program ${programAddress}`);
  }

  public async getAndInferAndDecodeAccountInfo(accountAddress: Pubkey) {
    const { accountInfo } = await rpcHttpGetAccountWithData(
      this.rpcHttp,
      accountAddress,
    );
    const programIdl = await this.getOrLoadProgramIdl(accountInfo.owner);
    const accountIdl = idlProgramGuessAccount(programIdl, accountInfo.data);
    if (!accountIdl) {
      throw new Error(
        `IDL Account not found for account ${accountAddress} of program ${accountInfo.owner}`,
      );
    }
    return {
      programInfo: {
        idl: programIdl,
      },
      accountInfo: {
        ...accountInfo,
        idl: accountIdl,
        state: idlAccountDecode(accountIdl, accountInfo.data),
      },
    };
  }

  public async inferAndDecodeInstruction(instruction: Instruction) {
    const programIdl = await this.getOrLoadProgramIdl(
      instruction.programAddress,
    );
    const instructionIdl = idlProgramGuessInstruction(programIdl, instruction);
    if (!instructionIdl) {
      throw new Error(
        `IDL Instruction not found for instruction of program ${instruction.programAddress}`,
      );
    }
    return idlInstructionDecode(instructionIdl, instruction);
  }

  public async getAndHydrateAndEncodeInstruction(
    programAddress: Pubkey,
    instructionName: string,
    instructionInfo: {
      // TODO (naming) - better name/structure for instructionInfo ?
      instructionAddresses: Record<string, Pubkey>;
      instructionPayload: JsonValue;
    },
  ) {
    const hydratedInstructionAddresses =
      await this.getAndFindInstructionAddresses(
        programAddress,
        instructionName,
        {
          instructionAddresses: instructionInfo.instructionAddresses,
          instructionPayload: instructionInfo.instructionPayload,
        },
      );
    const programIdl = await this.getOrLoadProgramIdl(programAddress);
    const instructionIdl = programIdl.instructions.get(instructionName);
    if (!instructionIdl) {
      throw new Error(
        `IDL Instruction ${instructionName} not found for program ${programAddress}`,
      );
    }
    return idlInstructionEncode(
      instructionIdl,
      programAddress,
      hydratedInstructionAddresses,
      instructionInfo.instructionPayload,
    );
  }

  public async getAndFindInstructionAddresses(
    programAddress: Pubkey,
    instructionName: string,
    instructionInfo: {
      instructionAddresses: Record<string, Pubkey>;
      instructionPayload: JsonValue;
    },
  ) {
    const programIdl = await this.getOrLoadProgramIdl(programAddress);
    const instructionIdl = programIdl.instructions.get(instructionName);
    if (!instructionIdl) {
      throw new Error(
        `IDL Instruction ${instructionName} not found for program ${programAddress}`,
      );
    }
    const findContext = {
      instructionProgramAddress: programAddress,
      instructionAddresses: instructionInfo.instructionAddresses,
      instructionPayload: instructionInfo.instructionPayload,
      instructionAccountsStates: {} as Record<string, JsonValue>,
      instructionAccountsTypes: {} as Record<string, IdlTypeFull>,
    };
    for (const [instructionAccountName, instructionAddress] of Object.entries(
      findContext.instructionAddresses,
    )) {
      const { accountInfo } =
        await this.getAndInferAndDecodeAccountInfo(instructionAddress);
      findContext.instructionAccountsStates[instructionAccountName] =
        accountInfo.state;
      findContext.instructionAccountsTypes[instructionAccountName] =
        accountInfo.idl.typeFull;
    }
    while (true) {
      let madeProgress = false;
      for (let instructionAccountIdl of instructionIdl.accounts) {
        if (
          findContext.instructionAddresses.hasOwnProperty(
            instructionAccountIdl.name,
          )
        ) {
          continue;
        }
        try {
          await withErrorContext(
            `Idl: Finding address for instruction account ${instructionAccountIdl.name}`,
            async () => {
              let instructionAddress = idlInstructionAccountFind(
                instructionAccountIdl,
                findContext,
              );
              findContext.instructionAddresses[instructionAccountIdl.name] =
                instructionAddress;
              const { accountInfo } =
                await this.getAndInferAndDecodeAccountInfo(instructionAddress);
              findContext.instructionAccountsStates[
                instructionAccountIdl.name
              ] = accountInfo.state;
              findContext.instructionAccountsTypes[instructionAccountIdl.name] =
                accountInfo.idl.typeFull;
              madeProgress = true;
            },
          );
        } catch (_error) {
          // TODO (error) - better error handling and help with understanding what is missing
        }
      }
      if (!madeProgress) {
        break;
      }
    }
    return findContext.instructionAddresses;
  }

  public async getRecentBlockHash() {
    const nowTimeMs = Date.now();
    if (
      this.recentBlockHash &&
      nowTimeMs - this.recentBlockHash.timeMs < 15000 /* 15 seconds */
    ) {
      return this.recentBlockHash.hash;
    }
    const { blockInfo } = await rpcHttpGetLatestBlockHash(this.rpcHttp);
    this.recentBlockHash = {
      hash: blockInfo.hash,
      timeMs: nowTimeMs,
    };
    return blockInfo.hash;
  }

  public async prepareAndSendTransaction(
    payer: Signer | WalletAccount,
    instructions: Array<Instruction>,
    options?: {
      extraSigners?: Array<Signer | WalletAccount>;
      skipAlreadySentCheck?: boolean;
      skipPreflight?: boolean;
    },
  ) {
    const recentBlockHash = await this.getRecentBlockHash();
    const signers = [payer];
    if (options?.extraSigners) {
      signers.push(...options.extraSigners);
    }
    const transactionPacket = await transactionCompileAndSign(signers, {
      payerAddress: payer.address,
      recentBlockHash: recentBlockHash,
      instructions,
    });
    const transactionHandle = await rpcHttpSendTransaction(
      this.rpcHttp,
      transactionPacket,
      {
        skipAlreadySentCheck: options?.skipAlreadySentCheck,
        skipPreflight: options?.skipPreflight,
      } as any,
    );
    return { transactionHandle };
  }
}

function standardLoaders(rpcHttp: RpcHttp) {
  return [
    idlLoaderFromOnchain(async (programAddress) => {
      const { accountInfo } = await rpcHttpGetAccountWithData(
        rpcHttp,
        programAddress,
      );
      return accountInfo.data;
    }),
    idlLoaderFromUrl((programAddress) => {
      return `https://raw.githubusercontent.com/crypto-vincent/solana-idls/refs/heads/main/data/${programAddress}.json`;
    }),
    idlLoaderFallbackToUnknown(),
  ];
}
