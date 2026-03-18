import { base58Encode } from "./Base58";
import { base64Encode } from "./Base64";
import { BlockSlot } from "./Block";
import { Pubkey } from "./Pubkey";
import { signatureToBytes } from "./Signature";
import {
  transactionExtractMessage,
  transactionExtractSigning,
  TransactionHandle,
  TransactionPacket,
} from "./Transaction";

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
 * - `"mainnet"` → {@link urlRpcPublicMainnet}
 * - `"devnet"` → {@link urlRpcPublicDevnet}
 * - `"testnet"` → {@link urlRpcPublicTestnet}
 *
 * Any other value is returned unchanged, allowing callers to pass a raw URL directly.
 *
 * @param rawUrlOrMoniker - A value representing a RPC endpoint's URL or a well-known moniker.
 * @returns The resolved RPC endpoint URL.
 */
export function urlRpcFromUrlOrMoniker(
  rawUrlOrMoniker: "mainnet" | "devnet" | "testnet" | string,
): URL {
  switch (rawUrlOrMoniker) {
    case "mainnet":
      return urlRpcPublicMainnet;
    case "devnet":
      return urlRpcPublicDevnet;
    case "testnet":
      return urlRpcPublicTestnet;
    default:
      return new URL(rawUrlOrMoniker);
  }
}

/**
 * Builds a Solana Explorer URL for an account (address) page.
 *
 * @param urlRpc - An RPC URL (see {@link urlRpcFromUrlOrMoniker})
 * @param accountAddress - The public key of the account to inspect.
 * @returns The full Explorer URL.
 */
export function urlExplorerAccount(urlRpc: URL, accountAddress: Pubkey) {
  return urlExplorer(urlRpc, "address", accountAddress.toString());
}

/**
 * Builds a Solana Explorer URL for a block page.
 *
 * @param urlRpc - An RPC URL (see {@link urlRpcFromUrlOrMoniker})
 * @param blockSlot - The slot number of the block to inspect.
 * @returns The full Explorer URL.
 */
export function urlExplorerBlock(urlRpc: URL, blockSlot: BlockSlot) {
  return urlExplorer(urlRpc, "block", blockSlot.toString());
}

/**
 * Builds a Solana Explorer URL for a confirmed transaction page.
 *
 * @param urlRpc - An RPC URL (see {@link urlRpcFromUrlOrMoniker})
 * @param transactionHandle - The {@link TransactionHandle} of the transaction to inspect.
 * @returns The full Explorer URL.
 */
export function urlExplorerTransaction(
  urlRpc: URL,
  transactionHandle: TransactionHandle,
) {
  return urlExplorer(urlRpc, "tx", transactionHandle.toString());
}

/**
 * Builds a Solana Explorer transaction-inspector URL that pre-loads the
 * encoded message and signatures so the transaction can be simulated without
 * being broadcast.
 *
 * @param urlRpc - An RPC URL (see {@link urlRpcFromUrlOrMoniker})
 * @param transactionPacket - The signed (or unsigned) {@link TransactionPacket}
 * @returns The full Explorer inspector URL.
 */
export function urlExplorerSimulation(
  urlRpc: URL,
  transactionPacket: TransactionPacket,
) {
  const message = transactionExtractMessage(transactionPacket);
  const signing = transactionExtractSigning(transactionPacket);
  return urlExplorer(urlRpc, "tx", "inspector", {
    message: base64Encode(message as Uint8Array),
    signatures: JSON.stringify(
      signing.map(({ signature }) => base58Encode(signatureToBytes(signature))),
    ),
  });
}

function urlExplorer(
  urlRpc: URL,
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
  args.push(urlExplorerArgCluster(urlRpc));
  return new URL(
    `https://explorer.solana.com/${category}/${payload}?${args.join("&")}`,
  );
}

function urlExplorerArgCluster(urlRpc: URL) {
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
