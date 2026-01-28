import { BlockHash, blockHashDefault } from "./data/Block";
import { casingLosslessConvertToSnake } from "./data/Casing";
import { InstructionRequest } from "./data/Instruction";
import { JsonValue } from "./data/Json";
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
  idlInstructionAccountsFind,
  IdlInstructionAddresses,
  idlInstructionArgsDecode,
  idlInstructionArgsEncode,
} from "./idl/IdlInstruction";
import {
  IdlInstructionBlobAccountContent,
  IdlInstructionBlobAccountsContext,
} from "./idl/IdlInstructionBlob";
import {
  IdlLoader,
  idlLoaderFallbackToUnknown,
  idlLoaderFromLoaderSequence,
  idlLoaderFromUrl,
  idlLoaderMemoized,
} from "./idl/IdlLoader";
import { idlLoaderFromOnchainAnchor } from "./idl/IdlLoaderOnchainAnchor";
import { idlLoaderFromOnchainNative } from "./idl/IdlLoaderOnchainNative";
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

  #recentBlockhashCacheDurationMs = 15_000;
  #recentBlockHashCacheValue: {
    blockHash: BlockHash;
    fetchTimeMs: number;
  } | null;

  constructor(
    rpcHttp: RpcHttp | string,
    options?: {
      customIdlPreload?: Map<Pubkey, IdlProgram>;
      customIdlLoaders?: Array<IdlLoader>;
      recentBlockhashCacheDurationMs?: number;
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
    this.#idlLoader = idlLoaderFromLoaderSequence(
      options?.customIdlLoaders ?? [recommendedIdlLoader(this.#rpcHttp)],
    );
    this.#recentBlockhashCacheDurationMs =
      options?.recentBlockhashCacheDurationMs ?? 15_000;
    this.#recentBlockHashCacheValue = null;
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
      return { programIdl: preloadIdl };
    }
    return { programIdl: await this.#idlLoader(programAddress) };
  }

  public async getOrLoadInstructionIdl(
    programAddress: Pubkey,
    instructionName: string,
  ) {
    const { programIdl } = await this.getOrLoadProgramIdl(programAddress);
    const instructionIdl = programIdl.instructions.get(
      casingLosslessConvertToSnake(instructionName),
    );
    if (!instructionIdl) {
      throw new Error(
        `IDL Instruction ${instructionName} not found for program ${programAddress}`,
      );
    }
    return { instructionIdl };
  }

  public async getAndInferAndDecodeAccount(accountAddress: Pubkey) {
    const { programAddress, accountExecutable, accountLamports, accountData } =
      await rpcHttpGetAccountWithData(this.#rpcHttp, accountAddress);
    const { programIdl } = await this.getOrLoadProgramIdl(programAddress);
    const accountIdl = idlProgramGuessAccount(programIdl, accountData);
    const { accountState } = idlAccountDecode(accountIdl, accountData);
    return {
      programIdl,
      accountIdl,
      programAddress,
      accountExecutable,
      accountLamports,
      accountData,
      accountState,
    };
  }

  public async inferAndDecodeInstruction(
    instructionRequest: InstructionRequest,
  ) {
    const { programIdl } = await this.getOrLoadProgramIdl(
      instructionRequest.programAddress,
    );
    const instructionIdl = idlProgramGuessInstruction(
      programIdl,
      instructionRequest,
    );
    const { instructionAddresses } = idlInstructionAccountsDecode(
      instructionIdl,
      instructionRequest.instructionInputs,
    );
    const { instructionPayload } = idlInstructionArgsDecode(
      instructionIdl,
      instructionRequest.instructionData,
    );
    return {
      programIdl,
      instructionIdl,
      instructionAddresses,
      instructionPayload,
    };
  }

  public async hydrateAndEncodeInstruction(
    programAddress: Pubkey,
    instructionName: string,
    options: {
      instructionAddresses: IdlInstructionAddresses;
      instructionPayload: JsonValue;
      accountsContext?: IdlInstructionBlobAccountsContext;
    },
  ): Promise<{ instructionRequest: InstructionRequest }> {
    const { instructionAddresses: hydratedInstructionAddresses } =
      await this.hydrateInstructionAddresses(programAddress, instructionName, {
        throwOnMissing: true,
        ...options,
      });
    const { instructionIdl } = await this.getOrLoadInstructionIdl(
      programAddress,
      instructionName,
    );
    const { instructionInputs } = idlInstructionAccountsEncode(
      instructionIdl,
      hydratedInstructionAddresses,
    );
    const { instructionData } = idlInstructionArgsEncode(
      instructionIdl,
      options.instructionPayload,
    );
    return {
      instructionRequest: {
        programAddress,
        instructionInputs,
        instructionData,
      },
    };
  }

  public async hydrateInstructionAddresses(
    programAddress: Pubkey,
    instructionName: string,
    options?: {
      throwOnMissing?: boolean;
      instructionAddresses?: IdlInstructionAddresses;
      instructionPayload?: JsonValue;
      accountsContext?: IdlInstructionBlobAccountsContext;
    },
  ) {
    const { instructionIdl } = await this.getOrLoadInstructionIdl(
      programAddress,
      instructionName,
    );
    const accountsCache = new Map<Pubkey, IdlInstructionBlobAccountContent>();
    return idlInstructionAccountsFind(instructionIdl, programAddress, {
      ...options,
      accountFetcher: async (accountAddress: Pubkey) => {
        const accountCached = accountsCache.get(accountAddress);
        if (accountCached) {
          return accountCached;
        }
        const { accountIdl, accountState } =
          await this.getAndInferAndDecodeAccount(accountAddress);
        const accountContent = {
          accountState,
          accountTypeFull: accountIdl.typeFull,
        };
        accountsCache.set(accountAddress, accountContent);
        return accountContent;
      },
    });
  }

  public async getRecentBlockHash() {
    const nowTimeMs = Date.now();
    if (this.#recentBlockHashCacheValue) {
      const cachedDurationMs =
        nowTimeMs - this.#recentBlockHashCacheValue.fetchTimeMs;
      if (cachedDurationMs < this.#recentBlockhashCacheDurationMs) {
        return this.#recentBlockHashCacheValue.blockHash;
      }
    }
    const { blockHash } = await rpcHttpGetLatestBlockHash(this.#rpcHttp);
    this.#recentBlockHashCacheValue = { blockHash, fetchTimeMs: nowTimeMs };
    return blockHash;
  }

  public async prepareAndSendTransaction(
    payerSigner: Signer | WalletAccount,
    instructionsRequests: Array<InstructionRequest>,
    options?: {
      extraSigners?: Array<Signer | WalletAccount>;
      transactionLookupTables?: Array<TransactionAddressLookupTable>;
      skipPreflight?: boolean;
    },
  ) {
    const payerAddress = payerSigner.address;
    const recentBlockHash = await this.getRecentBlockHash();
    const signers = [payerSigner];
    if (options?.extraSigners) {
      signers.push(...options.extraSigners);
    }
    const transactionPacket = await transactionCompileAndSign(
      signers,
      { payerAddress, recentBlockHash, instructionsRequests },
      options?.transactionLookupTables,
    );
    const { transactionHandle } = await rpcHttpSendTransaction(
      this.#rpcHttp,
      transactionPacket,
      options,
    );
    return { transactionHandle };
  }

  public async prepareAndSimulateTransaction(
    payer: Pubkey | Signer | WalletAccount,
    instructionsRequests: Array<InstructionRequest>,
    options?: {
      extraSigners?: Array<Signer | WalletAccount>;
      transactionLookupTables?: Array<TransactionAddressLookupTable>;
      verifySignaturesAndBlockHash?: boolean;
      simulatedAccountsAddresses?: Set<Pubkey>;
    },
  ) {
    let recentBlockHash = blockHashDefault;
    const signers = new Array<Signer | WalletAccount>();
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
      { payerAddress, recentBlockHash, instructionsRequests },
      options?.transactionLookupTables,
    );
    return rpcHttpSimulateTransaction(
      this.#rpcHttp,
      transactionPacket,
      options,
    );
  }

  public async findProgramOwnedAccounts(
    programAddress: Pubkey,
    accountName: string,
  ) {
    const { programIdl } = await this.getOrLoadProgramIdl(programAddress);
    const accountIdl = programIdl.accounts.get(accountName);
    if (!accountIdl) {
      throw new Error(
        `IDL Account ${accountName} not found for program ${programAddress}`,
      );
    }
    return rpcHttpFindProgramOwnedAccounts(this.#rpcHttp, programAddress, {
      dataBlobs: accountIdl.dataBlobs,
      dataSpace: accountIdl.dataSpace,
    });
  }
}

function recommendedIdlLoader(rpcHttp: RpcHttp) {
  const accountDataFetcher = async (programAddress: Pubkey) => {
    const { accountData } = await rpcHttpGetAccountWithData(
      rpcHttp,
      programAddress,
    );
    return accountData;
  };
  return idlLoaderMemoized(
    idlLoaderFromLoaderSequence([
      idlLoaderFromOnchainNative(accountDataFetcher),
      idlLoaderFromOnchainAnchor(accountDataFetcher),
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
