import { base64Encode } from "./Base64";
import { BlockSlot } from "./Block";
import { Pubkey } from "./Pubkey";
import { signatureToBase58 } from "./Signature";
import {
  transactionExtractMessage,
  transactionExtractSigning,
  TransactionHandle,
  TransactionPacket,
} from "./Transaction";

/** A union type representing either a well-known cluster moniker or a full RPC URL. */
export type UrlOrMoniker =
  | URL
  | "m"
  | "mainnet"
  | "d"
  | "devnet"
  | "t"
  | "testnet";

/** Public JSON-RPC endpoint for the Solana mainnet cluster. */
export const urlRpcPublicMainnet = new URL(
  "https://api.mainnet-beta.solana.com",
);

/** Public JSON-RPC endpoint for the Solana devnet cluster. */
export const urlRpcPublicDevnet = new URL("https://api.devnet.solana.com");

/** Public JSON-RPC endpoint for the Solana testnet cluster. */
export const urlRpcPublicTestnet = new URL("https://api.testnet.solana.com");

/**
 * Resolves a short moniker or a raw URL string to a canonical RPC endpoint URL.
 *
 * Accepted monikers:
 * - `"m"`, `"mainnet"` → {@link urlRpcPublicMainnet}
 * - `"d"`, `"devnet"` → {@link urlRpcPublicDevnet}
 * - `"t"`, `"testnet"` → {@link urlRpcPublicTestnet}
 *
 * Any other value is returned unchanged, allowing callers to pass a raw URL
 * directly.
 *
 * @param rpcUrlOrMoniker - A well-known moniker or a full RPC URL.
 * @returns The resolved RPC endpoint URL string.
 */
export function urlRpcFromUrlOrMoniker(rpcUrlOrMoniker: UrlOrMoniker): URL {
  switch (rpcUrlOrMoniker) {
    case "m":
    case "mainnet":
      return urlRpcPublicMainnet;
    case "d":
    case "devnet":
      return urlRpcPublicDevnet;
    case "t":
    case "testnet":
      return urlRpcPublicTestnet;
    default:
      return rpcUrlOrMoniker;
  }
}

/**
 * Builds a Solana Explorer URL for an account (address) page.
 *
 * @param rpc - An RPC URL or moniker (see {@link urlRpcFromUrlOrMoniker}) used
 *   to select the correct cluster query parameter.
 * @param accountAddress - The public key of the account to inspect.
 * @returns The full Explorer URL string.
 */
export function urlExplorerAccount(
  rpcUrlOrMoniker: UrlOrMoniker,
  accountAddress: Pubkey,
) {
  return urlExplorer(rpcUrlOrMoniker, "address", accountAddress.toString());
}

/**
 * Builds a Solana Explorer URL for a block page.
 *
 * @param rpc - An RPC URL or moniker (see {@link urlRpcFromUrlOrMoniker}) used
 *   to select the correct cluster query parameter.
 * @param blockSlot - The slot number of the block to inspect.
 * @returns The full Explorer URL string.
 */
export function urlExplorerBlock(
  rpcUrlOrMoniker: UrlOrMoniker,
  blockSlot: BlockSlot,
) {
  return urlExplorer(rpcUrlOrMoniker, "block", blockSlot.toString());
}

/**
 * Builds a Solana Explorer URL for a confirmed transaction page.
 *
 * @param rpc - An RPC URL or moniker (see {@link urlRpcFromUrlOrMoniker}) used
 *   to select the correct cluster query parameter.
 * @param transactionHandle - The {@link TransactionHandle} (signature) of the
 *   confirmed transaction.
 * @returns The full Explorer URL string.
 */
export function urlExplorerTransaction(
  rpcUrlOrMoniker: UrlOrMoniker,
  transactionHandle: TransactionHandle,
) {
  return urlExplorer(rpcUrlOrMoniker, "tx", transactionHandle.toString());
}

/**
 * Builds a Solana Explorer transaction-inspector URL that pre-loads the
 * encoded message and signatures so the transaction can be simulated without
 * being broadcast.
 *
 * @param rpc - An RPC URL or moniker (see {@link urlRpcFromUrlOrMoniker}) used
 *   to select the correct cluster query parameter.
 * @param transactionPacket - The signed (or unsigned) {@link TransactionPacket}
 *   whose message and signatures will be embedded in the URL.
 * @returns The full Explorer inspector URL string.
 */
export function urlExplorerSimulation(
  rpcUrlOrMoniker: UrlOrMoniker,
  transactionPacket: TransactionPacket,
) {
  const message = transactionExtractMessage(transactionPacket);
  const signing = transactionExtractSigning(transactionPacket);
  return urlExplorer(rpcUrlOrMoniker, "tx", "inspector", {
    message: base64Encode(message as Uint8Array),
    signatures: JSON.stringify(
      signing.map(({ signature }) => signatureToBase58(signature)),
    ),
  });
}

function urlExplorer(
  rpcUrlOrMoniker: UrlOrMoniker,
  category: string,
  payload: string,
  params?: Record<string, string>,
) {
  const args = [];
  if (params !== undefined) {
    for (const [key, value] of Object.entries(params)) {
      args.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  args.push(urlExplorerArgCluster(rpcUrlOrMoniker));
  return `https://explorer.solana.com/${category}/${payload}?${args.join("&")}`;
}

function urlExplorerArgCluster(rpcUrlOrMoniker: UrlOrMoniker) {
  const urlRpc = urlRpcFromUrlOrMoniker(rpcUrlOrMoniker);
  switch (urlRpc) {
    case urlRpcPublicMainnet:
      return "cluster=mainnet-beta";
    case urlRpcPublicDevnet:
      return "cluster=devnet";
    case urlRpcPublicTestnet:
      return "cluster=testnet";
    default:
      return `customUrl=${encodeURIComponent(urlRpc.toString())}`;
  }
}
