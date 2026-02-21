import { BlockHash, blockHashDefault } from "./data/Block";
import { InstructionRequest } from "./data/Instruction";
import { JsonValue } from "./data/Json";
import { Pubkey } from "./data/Pubkey";
import { Signer } from "./data/Signer";
import {
  TransactionAddressLookupTable,
  transactionCompileAndSign,
} from "./data/Transaction";
import { urlRpcFromUrlOrMoniker } from "./data/Url";
import { mapGuessIntendedKey } from "./data/Utils";
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
import { rpcHttpSendTransaction } from "./rpc/RpcHttpSendTransaction";
import { rpcHttpSimulateTransaction } from "./rpc/RpcHttpSimulateTransaction";

/**
 * High-level entry point for interacting with the Solana blockchain.
 *
 * `Solana` wraps an RPC HTTP client and an IDL loader to provide a rich,
 * ergonomic API for common on-chain operations:
 * - Loading and caching program IDLs (with optional per-program overrides)
 * - Decoding on-chain account state using IDL type information
 * - Building, encoding, and decoding instructions
 * - Deriving PDA (Program Derived Address) addresses
 * - Preparing, signing, sending, and simulating transactions
 * - Querying all accounts owned by a given program
 *
 * @example
 * ```ts
 * const solana = new Solana("mainnet");
 * const { accountState } = await solana.getAndInferAndDecodeAccount(myAddress);
 * ```
 */
export class Solana {
  readonly #rpcHttp: RpcHttp;
  readonly #idlOverrides: Map<Pubkey, IdlProgram>;
  readonly #idlLoader: IdlLoader;

  #recentBlockHashCacheDurationMs = 15_000;
  #recentBlockHashCacheValue: {
    blockHash: BlockHash;
    fetchTimeMs: number;
  } | null;

  /**
   * Creates a new `Solana` instance.
   *
   * @param rpcHttp - An existing {@link RpcHttp} client or a public cluster moniker (`"mainnet"`, `"devnet"`, or `"testnet"`) to connect to.
   * @param options - Optional configuration.
   * @param options.idlLoader - Custom IDL loader to use instead of the built-in
   *   sequence (on-chain native → on-chain Anchor → remote GitHub fallback).
   * @param options.idlOverrides - Map of program addresses to IDLs that should
   *   be used unconditionally, bypassing the loader entirely.
   * @param options.recentBlockHashCacheDurationMs - How long (in milliseconds)
   *   to cache the most-recently fetched block hash. Defaults to `15_000` ms.
   */
  constructor(
    rpcHttp: RpcHttp | "mainnet" | "devnet" | "testnet",
    options?: {
      idlLoader?: IdlLoader;
      idlOverrides?: Map<Pubkey, IdlProgram>;
      recentBlockHashCacheDurationMs?: number;
    },
  ) {
    if (typeof rpcHttp === "string") {
      this.#rpcHttp = rpcHttpFromUrl(urlRpcFromUrlOrMoniker(rpcHttp), {
        commitment: "confirmed",
      });
    } else {
      this.#rpcHttp = rpcHttp;
    }
    this.#idlOverrides = options?.idlOverrides ?? new Map();
    this.#idlLoader = options?.idlLoader ?? recommendedIdlLoader(this.#rpcHttp);
    this.#recentBlockHashCacheDurationMs =
      options?.recentBlockHashCacheDurationMs ?? 15_000;
    this.#recentBlockHashCacheValue = null;
  }

  /**
   * Returns the underlying RPC HTTP client used by this instance.
   *
   * @returns The {@link RpcHttp} client.
   */
  public getRpcHttp() {
    return this.#rpcHttp;
  }

  /**
   * Registers or removes a program IDL override for the given program address.
   *
   * When an override is set, {@link getOrLoadProgramIdl} will return it
   * directly without consulting the IDL loader.
   *
   * @param programAddress - The on-chain address of the program.
   * @param programIdl - The IDL to use for this program, or `undefined` to
   *   remove a previously registered override.
   */
  public setProgramIdlOverride(
    programAddress: Pubkey,
    programIdl: IdlProgram | undefined,
  ) {
    if (programIdl === undefined) {
      this.#idlOverrides.delete(programAddress);
    } else {
      this.#idlOverrides.set(programAddress, programIdl);
    }
  }

  /**
   * Returns the IDL for a program, using an in-memory override when available
   * and falling back to the configured IDL loader otherwise.
   *
   * @param programAddress - The on-chain address of the program.
   * @param options - Optional behaviour flags.
   * @param options.fallbackOnUnknown - When `true`, returns a minimal
   *   "unknown-program" IDL instead of throwing if the loader cannot find the
   *   IDL. Defaults to `false`.
   * @returns An object containing the resolved {@link IdlProgram}.
   * @throws If the loader cannot find the IDL and `fallbackOnUnknown` is not
   *   set to `true`.
   */
  public async getOrLoadProgramIdl(
    programAddress: Pubkey,
    options?: { fallbackOnUnknown?: boolean },
  ) {
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
   * Derives a PDA (Program Derived Address) for a named PDA defined in the
   * program's IDL.
   *
   * @param programAddress - The on-chain address of the program that owns the
   *   PDA.
   * @param pdaName - The name of the PDA as declared in the program's IDL.
   * @param pdaInputs - Key/value pairs used to seed the PDA derivation.
   *   Defaults to an empty object when omitted.
   * @returns The derived PDA {@link Pubkey} together with its canonical bump
   *   seed, as returned by {@link idlPdaFind}.
   * @throws If the program IDL cannot be loaded, or if no PDA named
   *   `pdaName` exists in the IDL.
   */
  public async findPdaAddress(
    programAddress: Pubkey,
    pdaName: string,
    pdaInputs?: Record<string, JsonValue>,
  ) {
    const { programIdl } = await this.getOrLoadProgramIdl(programAddress);
    const pdaIdl = getFromMap("PDA", programIdl.pdas, pdaName, programAddress);
    return idlPdaFind(pdaIdl, pdaInputs ?? {}, programAddress);
  }

  /**
   * Loads the IDL for a specific instruction of a program.
   *
   * @param programAddress - The on-chain address of the program.
   * @param instructionName - The name of the instruction as declared in the
   *   program's IDL.
   * @returns An object containing the resolved instruction IDL.
   * @throws If the program IDL cannot be loaded, or if no instruction named
   *   `instructionName` exists in the IDL.
   */
  public async getOrLoadInstructionIdl(
    programAddress: Pubkey,
    instructionName: string,
  ) {
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
   * Fetches an on-chain account, infers its type from the owning program's IDL,
   * and decodes its data into a typed state object.
   *
   * @param accountAddress - The public key of the account to fetch and decode.
   * @returns An object containing:
   *   - `programAddress` – address of the program that owns the account
   *   - `programIdl` – the resolved IDL for the owning program
   *   - `accountAddress` – the queried account address
   *   - `accountIdl` – the inferred account type from the IDL
   *   - `accountLamports` – the account balance in lamports
   *   - `accountExecutable` – whether the account is marked executable
   *   - `accountData` – raw account data bytes
   *   - `accountState` – decoded account state according to the IDL schema
   * @throws If the account does not exist or the RPC request fails.
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
   * Infers the instruction type from its raw on-chain representation and
   * decodes both its account addresses and its argument payload.
   *
   * @param instructionRequest - The raw instruction to decode, including the
   *   program address, account inputs, and serialised instruction data.
   * @returns An object containing:
   *   - `programIdl` – the resolved IDL for the program
   *   - `instructionIdl` – the inferred instruction definition from the IDL
   *   - `instructionAddresses` – decoded named account addresses
   *   - `instructionPayload` – decoded instruction arguments as a JSON value
   * @throws If the program IDL cannot be loaded, or if the instruction
   *   discriminator does not match any known instruction.
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
   * Builds a fully-encoded {@link InstructionRequest} from human-friendly
   * named addresses and a JSON argument payload.
   *
   * Missing accounts are resolved automatically using
   * {@link hydrateInstructionAddresses} before encoding.
   *
   * @param programAddress - The on-chain address of the target program.
   * @param instructionName - The name of the instruction as declared in the
   *   program's IDL.
   * @param options - Encoding inputs.
   * @param options.instructionAddresses - Named account addresses for the
   *   instruction (may be partial; missing accounts will be derived).
   * @param options.instructionPayload - Instruction arguments as a JSON value.
   * @param options.accountsContext - Optional context blob used to resolve
   *   accounts that require on-chain state (e.g. associated-token accounts).
   * @returns An object containing the encoded {@link InstructionRequest} ready
   *   to be passed to {@link prepareAndSendTransaction} or
   *   {@link prepareAndSimulateTransaction}.
   * @throws If the program IDL cannot be loaded, if the instruction does not
   *   exist, or if a required account address cannot be resolved.
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
   * Resolves and fills in any missing account addresses for an instruction by
   * consulting the IDL's account-finding rules and on-chain state.
   *
   * PDAs and associated-token accounts that can be derived from already-known
   * addresses or the optional `accountsContext` blob are resolved
   * automatically. Accounts that remain unresolvable are left as-is (or an
   * error is thrown when `throwOnMissing` is `true`).
   *
   * @param programAddress - The on-chain address of the target program.
   * @param instructionName - The name of the instruction as declared in the
   *   program's IDL.
   * @param options - Resolution options.
   * @param options.throwOnMissing - When `true`, throws if any required account
   *   address cannot be resolved. Defaults to `false`.
   * @param options.instructionAddresses - Partially-filled named account
   *   addresses to start from.
   * @param options.instructionPayload - Instruction arguments, used when
   *   account derivation depends on argument values.
   * @param options.accountsContext - Optional context blob providing
   *   additional on-chain data for account resolution.
   * @returns The result of {@link idlInstructionAccountsFind}, containing the
   *   hydrated `instructionAddresses` map.
   * @throws If `throwOnMissing` is `true` and a required account cannot be
   *   resolved.
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

  /**
   * Returns the most recent block hash, using an in-memory cache to avoid
   * redundant RPC calls.
   *
   * The cached value is reused for up to `recentBlockHashCacheDurationMs`
   * milliseconds (default 15 s). A fresh value is fetched when the cache
   * entry has expired.
   *
   * @returns The latest {@link BlockHash} string.
   * @throws If the RPC call fails.
   */
  public async getRecentBlockHash() {
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
   * Compiles, signs, and submits a transaction to the network.
   *
   * Fetches a recent block hash automatically (using the cache), gathers all
   * signers, compiles the versioned transaction, and sends it via the
   * configured RPC endpoint.
   *
   * @param payerSigner - The transaction fee-payer; must be able to sign (i.e.
   *   a {@link Signer} or {@link WalletAccount} with signing capability).
   * @param instructionsRequests - Ordered list of instructions to include in
   *   the transaction.
   * @param options - Optional submission settings.
   * @param options.extraSigners - Additional signers required by the
   *   instructions (e.g. multisig co-signers or program-owned keypairs).
   * @param options.transactionLookupTables - Address lookup tables to attach
   *   to the versioned transaction for account index compression.
   * @param options.skipPreflight - When `true`, skips the preflight simulation
   *   performed by the RPC node before broadcasting. Defaults to `false`.
   * @returns An object containing the `transactionHandle` (transaction
   *   signature string) that can be used to confirm the transaction.
   * @throws If signing fails, or if the RPC rejects the transaction.
   */
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

  /**
   * Compiles, optionally signs, and simulates a transaction without
   * broadcasting it to the network.
   *
   * By default the transaction is fully signed with a real block hash so that
   * the simulation is as close to live execution as possible. Signature
   * verification and block-hash fetching can be disabled by setting
   * `verifySignaturesAndBlockHash` to `false`, which is useful for quick
   * read-only simulations where signers are unavailable.
   *
   * @param payer - The fee-payer, supplied either as a raw {@link Pubkey}
   *   (address-only, no signing) or as a {@link Signer} / {@link WalletAccount}
   *   when `verifySignaturesAndBlockHash` is `true`.
   * @param instructionsRequests - Ordered list of instructions to simulate.
   * @param options - Optional simulation settings.
   * @param options.extraSigners - Additional signers collected when signature
   *   verification is enabled.
   * @param options.transactionLookupTables - Address lookup tables to attach
   *   to the versioned transaction.
   * @param options.verifySignaturesAndBlockHash - When `false`, skips signature
   *   collection and uses a default (zeroed) block hash. Defaults to `true`.
   * @param options.simulatedAccountsAddresses - Set of account addresses whose
   *   post-simulation state should be returned in the simulation result.
   * @returns The simulation result from {@link rpcHttpSimulateTransaction},
   *   including logs, compute-units consumed, and optional account states.
   * @throws If the RPC simulation request fails.
   */
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

  /**
   * Fetches all on-chain accounts owned by a program that match the layout of
   * a specific account type defined in the program's IDL.
   *
   * Uses `getProgramAccounts` RPC filters derived from the IDL account
   * definition (data size and/or discriminator blobs) to narrow results.
   *
   * @param programAddress - The on-chain address of the owning program.
   * @param accountName - The name of the account type as declared in the
   *   program's IDL.
   * @returns The result of {@link rpcHttpFindProgramOwnedAccounts}, containing
   *   an array of matching accounts with their raw data.
   * @throws If the program IDL cannot be loaded, if no account named
   *   `accountName` exists in the IDL, or if the RPC request fails.
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
        return `${githubRawBase}/${githubRepository}/${githubRefMain}/data/${programAddress}.json`;
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
