import { BlockHash, blockHashDefault } from "./data/Block";
import { Instruction } from "./data/Instruction";
import { JsonValue } from "./data/Json";
import { Pubkey } from "./data/Pubkey";
import { Signer } from "./data/Signer";
import {
  TransactionAddressLookupTable,
  transactionCompileAndSign,
} from "./data/Transaction";
import { WalletAccount } from "./data/Wallet";
import { idlAccountDecode } from "./idl/IdlAccount";
import {
  idlInstructionAccountsDecode,
  idlInstructionAccountsEncode,
  idlInstructionAddressesHydrate,
  idlInstructionArgsDecode,
  idlInstructionArgsEncode,
} from "./idl/IdlInstruction";
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
import { rpcHttpSimulateTransaction } from "./rpc/RpcHttpSimulateTransaction";

export class Service {
  private readonly rpcHttp: RpcHttp;
  private readonly idlLoaders: Array<IdlLoader>;
  private readonly idlOverrides: Map<Pubkey, IdlProgram>;
  private cacheBlockHash: { blockHash: BlockHash; fetchTimeMs: number } | null;

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
    this.cacheBlockHash = null;
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
        address: accountInfo.owner,
        idl: programIdl,
      },
      accountInfo: {
        ...accountInfo,
        idl: accountIdl,
        state: idlAccountDecode(accountIdl, accountInfo.data),
      },
    };
  }

  public async inferAndDecodeInstructionInfo(instruction: Instruction) {
    const programIdl = await this.getOrLoadProgramIdl(
      instruction.programAddress,
    );
    const instructionIdl = idlProgramGuessInstruction(programIdl, instruction);
    if (!instructionIdl) {
      throw new Error(
        `IDL Instruction not found for instruction of program ${instruction.programAddress}`,
      );
    }
    const instructionAddresses = idlInstructionAccountsDecode(
      instructionIdl,
      instruction.inputs,
    );
    const instructionPayload = idlInstructionArgsDecode(
      instructionIdl,
      instruction.data,
    );
    return {
      programInfo: {
        address: instruction.programAddress,
        idl: programIdl,
      },
      instructionInfo: {
        idl: instructionIdl,
        addresses: instructionAddresses,
        payload: instructionPayload,
      },
    };
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
      await this.getAndHydrateInstructionAddresses(
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
    const instructionInputs = idlInstructionAccountsEncode(
      instructionIdl,
      hydratedInstructionAddresses,
    );
    const instructionData = idlInstructionArgsEncode(
      instructionIdl,
      instructionInfo.instructionPayload,
    );
    return { programAddress, inputs: instructionInputs, data: instructionData };
  }

  public async getAndHydrateInstructionAddresses(
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
    const accountFetchCache = new Map<
      Pubkey,
      { accountState: JsonValue; accountTypeFull: IdlTypeFull }
    >();
    const accountContentFetcher = async (accountAddress: Pubkey) => {
      const accountFetchCached = accountFetchCache.get(accountAddress);
      if (accountFetchCached) {
        return accountFetchCached;
      }
      const { accountInfo } =
        await this.getAndInferAndDecodeAccountInfo(accountAddress);
      const accountFetch = {
        accountState: accountInfo.state,
        accountTypeFull: accountInfo.idl.typeFull,
      };
      accountFetchCache.set(accountAddress, accountFetch);
      return accountFetch;
    };
    return await idlInstructionAddressesHydrate(
      instructionIdl,
      programAddress,
      instructionInfo,
      {
        byAccountName: {},
        fetcher: accountContentFetcher,
      },
    );
  }

  public async getRecentBlockHash() {
    const nowTimeMs = Date.now();
    if (
      this.cacheBlockHash &&
      nowTimeMs - this.cacheBlockHash.fetchTimeMs < 15000 /* 15 seconds */
    ) {
      return this.cacheBlockHash.blockHash;
    }
    const { blockInfo } = await rpcHttpGetLatestBlockHash(this.rpcHttp);
    this.cacheBlockHash = {
      blockHash: blockInfo.hash,
      fetchTimeMs: nowTimeMs,
    };
    return blockInfo.hash;
  }

  public async prepareAndSendTransaction(
    payer: Signer | WalletAccount,
    instructions: Array<Instruction>,
    options?: {
      extraSigners?: Array<Signer | WalletAccount>;
      transactionLookupTables?: Array<TransactionAddressLookupTable>;
      skipAlreadySentCheck?: boolean;
      skipPreflight?: boolean;
    },
  ) {
    const recentBlockHash = await this.getRecentBlockHash();
    const signers = [payer];
    if (options?.extraSigners) {
      signers.push(...options.extraSigners);
    }
    const transactionPacket = await transactionCompileAndSign(
      signers,
      {
        payerAddress: payer.address,
        recentBlockHash: recentBlockHash,
        instructions,
      },
      options?.transactionLookupTables,
    );
    const { transactionHandle } = await rpcHttpSendTransaction(
      this.rpcHttp,
      transactionPacket,
      {
        skipAlreadySentCheck: options?.skipAlreadySentCheck,
        skipPreflight: options?.skipPreflight,
      } as any,
    );
    return { transactionHandle };
  }

  public async simulateTransaction(
    payer: Pubkey | Signer | WalletAccount,
    instructions: Array<Instruction>,
    options?: {
      extraSigners?: Array<Signer | WalletAccount>;
      transactionLookupTables?: Array<TransactionAddressLookupTable>;
      verifySignaturesAndBlockHash?: boolean;
      simulatedAccountsAddresses?: Set<Pubkey>;
    },
  ) {
    let recentBlockHash = blockHashDefault;
    let signers = new Array<Signer | WalletAccount>();
    if (options?.verifySignaturesAndBlockHash ?? true) {
      recentBlockHash = await this.getRecentBlockHash();
      if (payer instanceof Object && "address" in payer) {
        signers.push(payer);
      }
      if (options?.extraSigners) {
        signers.push(...options.extraSigners);
      }
    }
    const payerAddress =
      payer instanceof Object && "address" in payer
        ? payer.address
        : (payer as Pubkey);
    const transactionPacket = await transactionCompileAndSign(
      signers,
      { payerAddress, recentBlockHash, instructions },
      options?.transactionLookupTables,
    );
    return await rpcHttpSimulateTransaction(this.rpcHttp, transactionPacket, {
      verifySignaturesAndBlockHash: options?.verifySignaturesAndBlockHash,
      simulatedAccountsAddresses: options?.simulatedAccountsAddresses,
    } as any);
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
