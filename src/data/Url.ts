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

export const urlPublicRpcMainnet = "https://api.mainnet-beta.solana.com";
export const urlPublicRpcDevnet = "https://api.devnet.solana.com";
export const urlPublicRpcTestnet = "https://api.testnet.solana.com";

export function urlRpcFromUrlOrMoniker(rpcUrlOrMoniker: string) {
  switch (rpcUrlOrMoniker) {
    case "m":
    case "mainnet":
    case "mainnet-beta":
      return urlPublicRpcMainnet;
    case "d":
    case "devnet":
      return urlPublicRpcDevnet;
    case "t":
    case "testnet":
      return urlPublicRpcTestnet;
    default:
      return rpcUrlOrMoniker;
  }
}

export function urlExplorerAccount(rpc: string, accountAddress: Pubkey) {
  return urlExplorer(rpc, "address", pubkeyToBase58(accountAddress), {});
}

export function urlExplorerBlock(rpc: string, blockSlot: BlockSlot) {
  return urlExplorer(rpc, "block", blockSlot.toString(), {});
}

export function urlExplorerTransaction(
  rpc: string,
  transactionHandle: TransactionHandle,
) {
  return urlExplorer(rpc, "tx", signatureToBase58(transactionHandle), {});
}

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
    case urlPublicRpcMainnet:
      return "cluster=mainnet-beta";
    case urlPublicRpcDevnet:
      return "cluster=devnet";
    case urlPublicRpcTestnet:
      return "cluster=testnet";
    default:
      return `customUrl=${encodeURIComponent(rpc)}`;
  }
}
