import { base64Encode } from "./Base64";
import { BlockSlot } from "./Block";
import { Pubkey, pubkeyToBase58 } from "./Pubkey";
import { signatureToBase58 } from "./Signature";
import {
  transactionExtractMessage,
  transactionExtractSigning,
  TransactionHandle,
  TransactionPacket,
} from "./Transaction";

/** Public JSON-RPC endpoint for the Solana mainnet-beta cluster. */
export const urlRpcPublicMainnet = "https://api.mainnet-beta.solana.com";

/** Public JSON-RPC endpoint for the Solana devnet cluster. */
export const urlRpcPublicDevnet = "https://api.devnet.solana.com";

/** Public JSON-RPC endpoint for the Solana testnet cluster. */
export const urlRpcPublicTestnet = "https://api.testnet.solana.com";

/**
 * Resolves a short moniker or a raw URL string to a canonical RPC endpoint URL.
 *
 * Accepted monikers:
 * - `"m"`, `"mainnet"`, `"mainnet-beta"` → {@link urlRpcPublicMainnet}
 * - `"d"`, `"devnet"` → {@link urlRpcPublicDevnet}
 * - `"t"`, `"testnet"` → {@link urlRpcPublicTestnet}
 *
 * Any other value is returned unchanged, allowing callers to pass a raw URL
 * directly.
 *
 * @param rpcUrlOrMoniker - A well-known moniker or a full RPC URL.
 * @returns The resolved RPC endpoint URL string.
 */
export function urlRpcFromUrlOrMoniker(rpcUrlOrMoniker: string) {
  switch (rpcUrlOrMoniker) {
    case "m":
    case "mainnet":
    case "mainnet-beta":
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
export function urlExplorerAccount(rpc: string, accountAddress: Pubkey) {
  return urlExplorer(rpc, "address", pubkeyToBase58(accountAddress), {});
}

/**
 * Builds a Solana Explorer URL for a block page.
 *
 * @param rpc - An RPC URL or moniker (see {@link urlRpcFromUrlOrMoniker}) used
 *   to select the correct cluster query parameter.
 * @param blockSlot - The slot number of the block to inspect.
 * @returns The full Explorer URL string.
 */
export function urlExplorerBlock(rpc: string, blockSlot: BlockSlot) {
  return urlExplorer(rpc, "block", blockSlot.toString(), {});
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
  rpc: string,
  transactionHandle: TransactionHandle,
) {
  return urlExplorer(rpc, "tx", signatureToBase58(transactionHandle), {});
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
  rpc: string,
  transactionPacket: TransactionPacket,
) {
  const message = transactionExtractMessage(transactionPacket);
  const signing = transactionExtractSigning(transactionPacket);
  return urlExplorer(rpc, "tx", "inspector", {
    message: base64Encode(message as Uint8Array),
    signatures: JSON.stringify(
      signing.map(({ signature }) => signatureToBase58(signature)),
    ),
  });
}

function urlExplorer(
  rpc: string,
  category: string,
  payload: string,
  params: Record<string, string>,
) {
  const args = [];
  for (const [key, value] of Object.entries(params)) {
    args.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  }
  args.push(urlExplorerArgCluster(rpc));
  return `https://explorer.solana.com/${category}/${payload}?${args.join("&")}`;
}

function urlExplorerArgCluster(rpc: string) {
  const urlRpc = urlRpcFromUrlOrMoniker(rpc);
  switch (urlRpc) {
    case urlRpcPublicMainnet:
      return "cluster=mainnet-beta";
    case urlRpcPublicDevnet:
      return "cluster=devnet";
    case urlRpcPublicTestnet:
      return "cluster=testnet";
    default:
      return `customUrl=${encodeURIComponent(rpc)}`;
  }
}
