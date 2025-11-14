import { BlockHash, blockHashDefault } from "./data/Block";
import { casingLosslessConvertToSnake } from "./data/Casing";
import { Instruction } from "./data/Instruction";
import { Pubkey } from "./data/Pubkey";
import { Signer } from "./data/Signer";
import {
  TransactionAddressLookupTable,
  transactionCompileAndSign,
} from "./data/Transaction";
import { urlRpcFromUrlOrMoniker } from "./data/Url";
import { WalletAccount } from "./data/Wallet";
import { idlAccountDecode } from "./idl/IdlAccount";
import {
  idlInstructionAccountsDecode,
  idlInstructionAccountsEncode,
  idlInstructionAddressesHydrate,
  idlInstructionArgsDecode,
  idlInstructionArgsEncode,
  IdlInstructionInfo,
} from "./idl/IdlInstruction";
import {
  IdlInstructionBlobAccountContent,
  IdlInstructionBlobAccountsContext,
} from "./idl/IdlInstructionBlob";
import {
  IdlLoader,
  idlLoaderFallbackToUnknown,
  idlLoaderFromLoaderChain,
  idlLoaderFromOnchain,
  idlLoaderFromUrl,
  idlLoaderMemoized,
} from "./idl/IdlLoader";
import {
  IdlProgram,
  idlProgramGuessAccount,
  idlProgramGuessInstruction,
} from "./idl/IdlProgram";
import { RpcHttp, rpcHttpFromUrl } from "./rpc/RpcHttp";
import { rpcHttpFindProgramOwnedAccounts } from "./rpc/RpcHttpFindProgramOwnedAccounts";
import { rpcHttpGetAccountWithData } from "./rpc/RpcHttpGetAccountWithData";
import { rpcHttpGetLatestBlockHash } from "./rpc/RpcHttpGetLatestBlockHash";
import { rpcHttpSendTransaction } from "./rpc/RpcHttpSendTransaction";
import { rpcHttpSimulateTransaction } from "./rpc/RpcHttpSimulateTransaction";

export class Solana {
  readonly #rpcHttp: RpcHttp;
  readonly #idlPreload: Map<Pubkey, IdlProgram>;
  readonly #idlLoader: IdlLoader;
  #cacheBlockHash: { blockHash: BlockHash; fetchTimeMs: number } | null;

  constructor(
    rpcHttp: RpcHttp | string,
    options?: {
      customIdlPreload?: Map<Pubkey, IdlProgram>;
      customIdlLoaders?: Array<IdlLoader>;
    },
  ) {
    if (typeof rpcHttp === "string") {
      this.#rpcHttp = rpcHttpFromUrl(urlRpcFromUrlOrMoniker(rpcHttp), {
        commitment: "confirmed",
      });
    } else {
      this.#rpcHttp = rpcHttp;
    }
    this.#idlPreload = options?.customIdlPreload ?? new Map();
    this.#idlLoader = idlLoaderFromLoaderChain(
      options?.customIdlLoaders ?? [recommendedIdlLoader(this.#rpcHttp)],
    );
    this.#cacheBlockHash = null;
  }

  public getRpcHttp() {
    return this.#rpcHttp;
  }

  public setProgramIdl(
    programAddress: Pubkey,
    programIdl: IdlProgram | undefined,
  ) {
    if (programIdl === undefined) {
      this.#idlPreload.delete(programAddress);
    } else {
      this.#idlPreload.set(programAddress, programIdl);
    }
  }

  public async getOrLoadProgramIdl(programAddress: Pubkey) {
    const preloadIdl = this.#idlPreload.get(programAddress);
    if (preloadIdl) {
      return preloadIdl;
    }
    return await this.#idlLoader(programAddress);
  }

  public async getOrLoadInstructionIdl(
    programAddress: Pubkey,
    instructionName: string,
  ) {
    const programIdl = await this.getOrLoadProgramIdl(programAddress);
    const instructionIdl = programIdl.instructions.get(
      casingLosslessConvertToSnake(instructionName),
    );
    if (!instructionIdl) {
      throw new Error(
        `IDL Instruction ${instructionName} not found for program ${programAddress}`,
      );
    }
    return instructionIdl;
  }

  public async getAndInferAndDecodeAccount(accountAddress: Pubkey) {
    const { accountInfo } = await rpcHttpGetAccountWithData(
      this.#rpcHttp,
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

  public async hydrateAndEncodeInstruction(
    programAddress: Pubkey,
    instructionName: string,
    instructionInfo: IdlInstructionInfo,
  ) {
    const hydratedInstructionAddresses = await this.hydrateInstructionAddresses(
      programAddress,
      instructionName,
      instructionInfo,
    );
    const instructionIdl = await this.getOrLoadInstructionIdl(
      programAddress,
      instructionName,
    );
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

  public async hydrateInstructionAddresses(
    programAddress: Pubkey,
    instructionName: string,
    instructionInfo?: Partial<IdlInstructionInfo>,
    options?: {
      throwOnMissing?: boolean;
      accountsContext?: IdlInstructionBlobAccountsContext;
    },
  ) {
    const instructionIdl = await this.getOrLoadInstructionIdl(
      programAddress,
      instructionName,
    );
    const accountsCache = new Map<Pubkey, IdlInstructionBlobAccountContent>();
    return await idlInstructionAddressesHydrate(
      instructionIdl,
      programAddress,
      instructionInfo,
      {
        throwOnMissing: options?.throwOnMissing,
        accountsContext: options?.accountsContext,
        accountFetcher: async (accountAddress: Pubkey) => {
          const accountCached = accountsCache.get(accountAddress);
          if (accountCached) {
            return accountCached;
          }
          const { accountInfo } =
            await this.getAndInferAndDecodeAccount(accountAddress);
          const accountContent = {
            accountState: accountInfo.state,
            accountTypeFull: accountInfo.idl.typeFull,
          };
          accountsCache.set(accountAddress, accountContent);
          return accountContent;
        },
      } as any,
    );
  }

  public async getRecentBlockHash() {
    const nowTimeMs = Date.now();
    if (this.#cacheBlockHash) {
      if (nowTimeMs - this.#cacheBlockHash.fetchTimeMs < 15_000) {
        return this.#cacheBlockHash.blockHash;
      }
    }
    const { blockInfo } = await rpcHttpGetLatestBlockHash(this.#rpcHttp);
    this.#cacheBlockHash = {
      blockHash: blockInfo.hash,
      fetchTimeMs: nowTimeMs,
    };
    return blockInfo.hash;
  }

  public async prepareAndSendTransaction(
    payerSigner: Signer | WalletAccount,
    instructions: Array<Instruction>,
    options?: {
      extraSigners?: Array<Signer | WalletAccount>;
      transactionLookupTables?: Array<TransactionAddressLookupTable>;
      skipPreflight?: boolean;
      failOnAlreadyProcessed?: boolean;
    },
  ) {
    const recentBlockHash = await this.getRecentBlockHash();
    const signers = [payerSigner];
    if (options?.extraSigners) {
      signers.push(...options.extraSigners);
    }
    const transactionPacket = await transactionCompileAndSign(
      signers,
      { payerAddress: payerSigner.address, recentBlockHash, instructions },
      options?.transactionLookupTables,
    );
    const { transactionHandle } = await rpcHttpSendTransaction(
      this.#rpcHttp,
      transactionPacket,
      options as any,
    );
    return { transactionHandle };
  }

  public async prepareAndSimulateTransaction(
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
    return await rpcHttpSimulateTransaction(
      this.#rpcHttp,
      transactionPacket,
      options as any,
    );
  }

  public async findProgramOwnedAccounts(
    programAddress: Pubkey,
    accountName: string,
  ) {
    const programIdl = await this.getOrLoadProgramIdl(programAddress);
    const accountIdl = programIdl.accounts.get(accountName);
    if (!accountIdl) {
      throw new Error(
        `IDL Account ${accountName} not found for program ${programAddress}`,
      );
    }
    return await rpcHttpFindProgramOwnedAccounts(
      this.#rpcHttp,
      programAddress,
      {
        dataSpace: accountIdl.dataSpace,
        dataBlobs: accountIdl.dataBlobs,
      } as any,
    );
  }
}

function recommendedIdlLoader(rpcHttp: RpcHttp) {
  return idlLoaderMemoized(
    idlLoaderFromLoaderChain([
      idlLoaderFromOnchain(async (programAddress) => {
        const { accountInfo } = await rpcHttpGetAccountWithData(
          rpcHttp,
          programAddress,
        );
        return accountInfo.data;
      }),
      idlLoaderFromUrl((programAddress) => {
        const githubRawBase = "https://raw.githubusercontent.com";
        const githubRepository = "crypto-vincent/solana-idls";
        const githubRefMain = "refs/heads/main";
        return `${githubRawBase}/${githubRepository}/${githubRefMain}/data/${programAddress}.json`;
      }),
      idlLoaderFallbackToUnknown(),
    ]),
  );
}
