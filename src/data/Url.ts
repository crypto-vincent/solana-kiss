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
 * Sanitizes a moniker or raw URL string to an RPC endpoint URL.
 * Monikers: `"mainnet"`, `"devnet"`, `"testnet"`.
 * @param rawUrlOrMoniker - URL string or moniker.
 * @returns Resolved RPC URL.
 */
export function urlRpcFromUrlOrMoniker(
  rawUrlOrMoniker: URL | "mainnet" | "devnet" | "testnet" | string,
): URL {
  switch (rawUrlOrMoniker) {
    case "mainnet":
      return urlRpcPublicMainnet;
    case "devnet":
      return urlRpcPublicDevnet;
    case "testnet":
      return urlRpcPublicTestnet;
    default:
      if (typeof rawUrlOrMoniker === "string") {
        return new URL(rawUrlOrMoniker);
      }
      return rawUrlOrMoniker;
  }
}

/**
 * Builds a Solana Explorer URL for an account page.
 * @param urlRpc - RPC URL (see {@link urlRpcFromUrlOrMoniker}).
 * @param accountAddress - Account public key.
 * @returns Explorer URL.
 */
export function urlExplorerAccount(urlRpc: URL, accountAddress: Pubkey) {
  return urlExplorer(urlRpc, "address", accountAddress.toString());
}

/**
 * Builds a Solana Explorer URL for a block page.
 * @param urlRpc - RPC URL (see {@link urlRpcFromUrlOrMoniker}).
 * @param blockSlot - Block slot number.
 * @returns Explorer URL.
 */
export function urlExplorerBlock(urlRpc: URL, blockSlot: BlockSlot) {
  return urlExplorer(urlRpc, "block", blockSlot.toString());
}

/**
 * Builds a Solana Explorer URL for a transaction page.
 * @param urlRpc - RPC URL (see {@link urlRpcFromUrlOrMoniker}).
 * @param transactionHandle - Signature or handle identifying the transaction.
 * @returns Explorer URL.
 */
export function urlExplorerTransaction(
  urlRpc: URL,
  transactionHandle: TransactionHandle,
) {
  return urlExplorer(urlRpc, "tx", transactionHandle.toString());
}

/**
 * Builds a Solana Explorer transaction-inspector URL pre-loaded with the encoded message and signatures.
 * @param urlRpc - RPC URL (see {@link urlRpcFromUrlOrMoniker}).
 * @param transactionPacket - Signed (or unsigned) {@link TransactionPacket}.
 * @returns Explorer inspector URL.
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
