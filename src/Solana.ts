import { BlockHash, blockHashDefault } from "./data/Block";
import { InstructionRequest } from "./data/Instruction";
import { JsonValue } from "./data/Json";
import { Pubkey } from "./data/Pubkey";
import { Signer } from "./data/Signer";
import {
  TransactionAddressLookupTable,
  transactionCompileAndSign,
  TransactionProcessor,
} from "./data/Transaction";
import { urlRpcFromUrlOrMoniker } from "./data/Url";
import { mapGuessIntendedKey } from "./data/Utils";
import { WalletAccount } from "./data/Wallet";
import { idlAccountDecode } from "./idl/IdlAccount";
import {
  IdlInstruction,
  idlInstructionAccountsDecode,
  idlInstructionAccountsEncode,
  idlInstructionAccountsFind,
  IdlInstructionAddresses,
  idlInstructionArgsDecode,
  idlInstructionArgsEncode,
} from "./idl/IdlInstruction";
import { idlInstructionAccountFind } from "./idl/IdlInstructionAccount";
import {
  IdlInstructionBlobAccountContent,
  IdlInstructionBlobAccountsContext,
} from "./idl/IdlInstructionBlob";
import {
  IdlLoader,
  idlLoaderFromLoaderSequence,
  idlLoaderFromUrl,
  idlLoaderMemoized,
} from "./idl/IdlLoader";
import { idlLoaderFromOnchainAnchor } from "./idl/IdlLoaderOnchainAnchor";
import { idlLoaderFromOnchainNative } from "./idl/IdlLoaderOnchainNative";
import { idlPdaFind } from "./idl/IdlPda";
import {
  IdlProgram,
  idlProgramGuessAccount,
  idlProgramGuessInstruction,
  idlProgramUnknown,
} from "./idl/IdlProgram";
import { RpcHttp, rpcHttpFromUrl } from "./rpc/RpcHttp";
import { rpcHttpFindProgramOwnedAccounts } from "./rpc/RpcHttpFindProgramOwnedAccounts";
import { rpcHttpGetAccountWithData } from "./rpc/RpcHttpGetAccountWithData";
import { rpcHttpGetLatestBlockHash } from "./rpc/RpcHttpGetLatestBlockHash";
import { rpcHttpIsBlockHashValid } from "./rpc/RpcHttpIsBlockHashValid";
import { rpcHttpSendTransaction } from "./rpc/RpcHttpSendTransaction";
import { rpcHttpSimulateTransaction } from "./rpc/RpcHttpSimulateTransaction";
import { rpcHttpWaitForTransaction } from "./rpc/RpcHttpWaitForTransaction";

// TODO - add documentation website
// TODO - add versioning for slots and IDLs upgrades

/** High-level Solana client. Wraps RPC + IDL loader. */
export class Solana {
  readonly #rpcHttp: RpcHttp;
  readonly #idlOverrides: Map<Pubkey, Readonly<IdlProgram>>;
  readonly #idlLoader: IdlLoader;

  #recentBlockHashCacheDurationMs = 15_000;
  #recentBlockHashCacheValue: {
    blockHash: BlockHash;
    fetchTimeMs: number;
  } | null;

  /**
   * @param rpcHttpOrUrl - {@link RpcHttp}, URL, or moniker (`"mainnet"`, `"devnet"`, `"testnet"`).
   * @param options.idlLoader - Custom IDL loader (default: native → Anchor → GitHub).
   * @param options.idlOverrides - Per-program IDL overrides bypassing the loader.
   * @param options.recentBlockHashCacheDurationMs - Block hash cache TTL (default: `15_000` ms).
   */
  constructor(
    rpcHttpOrUrl: RpcHttp | URL | Parameters<typeof urlRpcFromUrlOrMoniker>[0],
    options?: {
      idlLoader?: IdlLoader;
      idlOverrides?: Map<Pubkey, Readonly<IdlProgram>>;
      recentBlockHashCacheDurationMs?: number;
    },
  ) {
    if (typeof rpcHttpOrUrl === "string") {
      this.#rpcHttp = rpcHttpFromUrl(urlRpcFromUrlOrMoniker(rpcHttpOrUrl));
    } else if (rpcHttpOrUrl instanceof URL) {
      this.#rpcHttp = rpcHttpFromUrl(rpcHttpOrUrl);
    } else {
      this.#rpcHttp = rpcHttpOrUrl;
    }
    this.#idlOverrides = options?.idlOverrides ?? new Map();
    this.#idlLoader = options?.idlLoader ?? recommendedIdlLoader(this.#rpcHttp);
    this.#recentBlockHashCacheDurationMs =
      options?.recentBlockHashCacheDurationMs ?? 15_000;
    this.#recentBlockHashCacheValue = null;
  }

  /** @returns The {@link RpcHttp} client. */
  public getRpcHttp() {
    return this.#rpcHttp;
  }

  /**
   * Registers or removes a program IDL override.
   * When set, {@link getOrLoadProgramIdl} returns it without consulting the loader.
   * @param programAddress - Program address.
   * @param programIdl - IDL to use, or `undefined` to remove the override.
   */
  public setProgramIdlOverride(
    programAddress: Pubkey,
    programIdl: Readonly<IdlProgram> | undefined,
  ) {
    if (programIdl === undefined) {
      this.#idlOverrides.delete(programAddress);
    } else {
      this.#idlOverrides.set(programAddress, programIdl);
    }
  }

  /**
   * Returns the IDL for a program. Uses override if set; otherwise uses the IDL loader.
   * @param programAddress - Program address.
   * @param options.fallbackOnUnknown - Return minimal "unknown-program" IDL instead of throwing.
   * @returns `{ programIdl }`.
   * @throws If the loader cannot find the IDL and `fallbackOnUnknown` is not set.
   */
  public async getOrLoadProgramIdl(
    programAddress: Pubkey,
    options?: { fallbackOnUnknown?: boolean },
  ): Promise<{ programIdl: Readonly<IdlProgram> }> {
    const programIdl = this.#idlOverrides.get(programAddress);
    if (programIdl) {
      return { programIdl: programIdl };
    }
    try {
      return { programIdl: await this.#idlLoader(programAddress) };
    } catch (error) {
      if (options?.fallbackOnUnknown) {
        return { programIdl: await idlProgramUnknown(programAddress) };
      }
      throw error;
    }
  }

  /**
   * Derives a PDA for a named PDA defined in the program's IDL.
   * @param programAddress - Program address.
   * @param pdaName - PDA name as declared in the IDL.
   * @param pdaInputs - Optional seed input values.
   * @returns Derived PDA {@link Pubkey}.
   * @throws If the IDL can't be loaded or PDA not found.
   */
  public async findPdaAddress(
    programAddress: Pubkey,
    pdaName: string,
    pdaInputs?: Record<string, JsonValue>,
  ): Promise<Pubkey> {
    const { programIdl } = await this.getOrLoadProgramIdl(programAddress);
    const pdaIdl = getFromMap("PDA", programIdl.pdas, pdaName, programAddress);
    return idlPdaFind(pdaIdl, pdaInputs ?? {}, programAddress);
  }

  /**
   * Returns the IDL for a specific instruction.
   * @param programAddress - Program address.
   * @param instructionName - Instruction name as declared in the IDL.
   * @returns `{ instructionIdl }`.
   * @throws If IDL can't be loaded or instruction not found.
   */
  public async getOrLoadInstructionIdl(
    programAddress: Pubkey,
    instructionName: string,
  ): Promise<{ instructionIdl: Readonly<IdlInstruction> }> {
    const { programIdl } = await this.getOrLoadProgramIdl(programAddress);
    const instructionIdl = getFromMap(
      "Instruction",
      programIdl.instructions,
      instructionName,
      programAddress,
    );
    return { instructionIdl };
  }

  /**
   * Fetches, infers, and decodes an on-chain account using its program's IDL.
   * @param accountAddress - Account to fetch.
   * @returns `{ programAddress, programIdl, accountAddress, accountIdl, accountLamports, accountExecutable, accountData, accountState }`.
   * @throws If the RPC request fails or account data cannot be decoded.
   */
  public async getAndInferAndDecodeAccount(accountAddress: Pubkey) {
    const { programAddress, accountExecutable, accountLamports, accountData } =
      await rpcHttpGetAccountWithData(this.#rpcHttp, accountAddress);
    const { programIdl } = await this.getOrLoadProgramIdl(programAddress, {
      fallbackOnUnknown: true,
    });
    const accountIdl = idlProgramGuessAccount(programIdl, accountData);
    const { accountState } = idlAccountDecode(accountIdl, accountData);
    return {
      programAddress,
      programIdl,
      accountAddress,
      accountIdl,
      accountLamports,
      accountExecutable,
      accountData,
      accountState,
    };
  }

  /**
   * Infers and decodes an instruction's account addresses and argument payload.
   * @param instructionRequest - Raw instruction (program, accounts, data).
   * @returns `{ programIdl, instructionIdl, instructionAddresses, instructionPayload }`.
   * @throws If IDL can't be loaded or discriminator doesn't match.
   */
  public async inferAndDecodeInstruction(
    instructionRequest: InstructionRequest,
  ) {
    const { programIdl } = await this.getOrLoadProgramIdl(
      instructionRequest.programAddress,
      { fallbackOnUnknown: true },
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

  /**
   * Builds an encoded {@link InstructionRequest} from named addresses and a JSON payload.
   * Missing accounts are resolved via {@link hydrateInstructionAddresses}.
   * @param programAddress - Program address.
   * @param instructionName - Instruction name as declared in the IDL.
   * @param options.instructionAddresses - Named account addresses (partial; missing will be derived).
   * @param options.instructionPayload - Instruction arguments as JSON.
   * @param options.accountsContext - Optional context for deriving accounts.
   * @returns `{ instructionRequest }`.
   * @throws If IDL can't be loaded, instruction not found, or account can't be resolved.
   */
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

  /**
   * Resolves missing account addresses for an instruction using IDL rules and on-chain state.
   * PDAs and ATAs derivable from known addresses are auto-resolved.
   * @param programAddress - Program address.
   * @param instructionName - Instruction name.
   * @param options.throwOnMissing - Throw if any required address can't be resolved.
   * @param options.instructionAddresses - Partially-filled account addresses.
   * @param options.instructionPayload - Instruction arguments (used for arg-based derivation).
   * @param options.accountsContext - Optional context for resolving accounts.
   * @returns Hydrated `{ instructionAddresses }`.
   * @throws If `throwOnMissing` is `true` and an account can't be resolved.
   */
  public async hydrateInstructionAddresses(
    programAddress: Pubkey,
    instructionName: string,
    options?: {
      throwOnMissing?: boolean;
      instructionAddresses?: IdlInstructionAddresses;
      instructionPayload?: JsonValue;
      accountsContext?: IdlInstructionBlobAccountsContext;
    },
  ): Promise<{ instructionAddresses: IdlInstructionAddresses }> {
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

  /**
   * Resolves a specific instruction account address by name.
   * @param programAddress - Program address.
   * @param instructionName - Instruction name.
   * @param instructionAccountName - Account name to resolve.
   * @param options.instructionAddresses - Partially-filled account addresses.
   * @param options.instructionPayload - Instruction arguments.
   * @param options.accountsContext - Optional context for account resolution.
   * @returns Resolved account {@link Pubkey}.
   * @throws If the account can't be resolved.
   */
  public async resolveInstructionAddress(
    programAddress: Pubkey,
    instructionName: string,
    instructionAccountName: string,
    options?: {
      instructionAddresses?: IdlInstructionAddresses;
      instructionPayload?: JsonValue;
      accountsContext?: IdlInstructionBlobAccountsContext;
    },
  ): Promise<Pubkey> {
    const { instructionAddresses } = await this.hydrateInstructionAddresses(
      programAddress,
      instructionName,
      options,
    );
    const { instructionIdl } = await this.getOrLoadInstructionIdl(
      programAddress,
      instructionName,
    );
    const findContext = {
      ...options,
      instructionAddresses,
    };
    for (const instructionAccountIdl of instructionIdl.accounts) {
      if (instructionAccountIdl.name === instructionAccountName) {
        return await idlInstructionAccountFind(
          instructionAccountIdl,
          programAddress,
          findContext,
        );
      }
    }
    throw new Error(
      `Idl: Could not find instruction account '${instructionAccountName}' in instruction '${instructionName}'`,
    );
  }

  /**
   * Returns the most recent block hash (cached, TTL = `recentBlockHashCacheDurationMs`).
   * @returns Latest {@link BlockHash}.
   * @throws If the RPC call fails.
   */
  public async getRecentBlockHash(): Promise<BlockHash> {
    const nowTimeMs = Date.now();
    if (this.#recentBlockHashCacheValue) {
      const cachedDurationMs =
        nowTimeMs - this.#recentBlockHashCacheValue.fetchTimeMs;
      if (cachedDurationMs < this.#recentBlockHashCacheDurationMs) {
        return this.#recentBlockHashCacheValue.blockHash;
      }
    }
    const { blockHash } = await rpcHttpGetLatestBlockHash(this.#rpcHttp);
    this.#recentBlockHashCacheValue = { blockHash, fetchTimeMs: nowTimeMs };
    return blockHash;
  }

  /**
   * Compiles, signs, and submits a transaction.
   * @param payerSigner - Fee-payer: {@link Signer}, {@link WalletAccount}, or `{ address, processor }`.
   * @param instructionsRequests - Instructions to include.
   * @param options.extraSigners - Additional signers.
   * @param options.transactionLookupTables - ALTs for account index compression.
   * @param options.skipPreflight - Skip preflight simulation.
   * @param options.skipExecutionFlowParsing - Skip call-stack trace parsing.
   * @returns `{ transactionHandle, transactionRequest, transactionPacket, executionReport, executionFlow }`.
   * @throws If signing fails or RPC rejects the transaction.
   */
  public async prepareAndExecuteTransaction(
    payerSigner:
      | Signer
      | WalletAccount
      | { address: Pubkey; processor: TransactionProcessor },
    instructionsRequests: Array<InstructionRequest>,
    options?: {
      extraSigners?: Array<Signer | WalletAccount | TransactionProcessor>;
      transactionLookupTables?: Array<TransactionAddressLookupTable>;
      skipPreflight?: boolean;
      skipExecutionFlowParsing?: boolean;
    },
  ) {
    const payerAddress = payerSigner.address;
    const recentBlockHash = await this.getRecentBlockHash();
    const signers = new Array<Signer | WalletAccount | TransactionProcessor>();
    if ("processor" in payerSigner) {
      signers.push(payerSigner.processor);
    } else {
      signers.push(payerSigner);
    }
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
    const { transactionRequest, executionReport, executionFlow } =
      await rpcHttpWaitForTransaction(
        this.#rpcHttp,
        transactionHandle,
        () => rpcHttpIsBlockHashValid(this.#rpcHttp, recentBlockHash),
        options,
      );
    return {
      transactionRequest,
      transactionHandle,
      transactionPacket,
      executionReport,
      executionFlow,
    };
  }

  /**
   * Compiles, optionally signs, and simulates a transaction without broadcasting.
   * @param payer - Fee-payer: raw {@link Pubkey} (no signing) or {@link Signer}/{@link WalletAccount}.
   * @param instructionsRequests - Instructions to simulate.
   * @param options.extraSigners - Additional signers.
   * @param options.transactionLookupTables - ALTs for versioned transactions.
   * @param options.verifySignaturesAndBlockHash - Skip signatures and use default blockhash if `false` (default: `true`).
   * @param options.simulatedAccountsAddresses - Account addresses whose post-simulation state to return.
   * @returns Simulation result (logs, compute units, account states).
   * @throws If the RPC simulation request fails.
   */
  public async prepareAndSimulateTransaction(
    payer: Pubkey | Signer | WalletAccount,
    instructionsRequests: Array<InstructionRequest>,
    options?: {
      extraSigners?: Array<Signer | WalletAccount | TransactionProcessor>;
      transactionLookupTables?: Array<TransactionAddressLookupTable>;
      verifySignaturesAndBlockHash?: boolean;
      simulatedAccountsAddresses?: Set<Pubkey>;
    },
  ) {
    let recentBlockHash = blockHashDefault;
    const signers = new Array<Signer | WalletAccount | TransactionProcessor>();
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

  /**
   * Fetches all accounts owned by a program that match a specific IDL account type.
   * @param programAddress - Program address.
   * @param accountName - Account type name as declared in the IDL.
   * @returns Result of {@link rpcHttpFindProgramOwnedAccounts}.
   * @throws If IDL can't be loaded, account type not found, or RPC fails.
   */
  public async findProgramOwnedAccounts(
    programAddress: Pubkey,
    accountName: string,
  ) {
    const { programIdl } = await this.getOrLoadProgramIdl(programAddress, {
      fallbackOnUnknown: true,
    });
    const accountIdl = getFromMap(
      "Account",
      programIdl.accounts,
      accountName,
      programAddress,
    );
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
        return new URL(
          `${githubRawBase}/${githubRepository}/${githubRefMain}/data/${programAddress}.json`,
        );
      }),
    ]),
  );
}

function getFromMap<T>(
  kind: string,
  map: Map<string, T>,
  key: string,
  programAddress: Pubkey,
): T {
  const value = map.get(mapGuessIntendedKey(map, key));
  if (value === undefined) {
    throw new Error(
      `IDL ${kind} ${key} not found for program ${programAddress} (available: [${[
        ...map.keys(),
      ].join(", ")}])`,
    );
  }
  return value;
}
