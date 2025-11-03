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

export function urlExplorerAccount(urlRpc: string, address: Pubkey) {
  return computeUrl(urlRpc, "address", pubkeyToBase58(address), {});
}

export function urlExplorerBlock(urlRpc: string, blockSlot: BlockSlot) {
  return computeUrl(urlRpc, "block", blockSlot.toString(), {});
}

export function urlExplorerTransaction(
  urlRpc: string,
  transactionHandle: TransactionHandle,
) {
  return computeUrl(urlRpc, "tx", signatureToBase58(transactionHandle), {});
}

export function urlExplorerSimulation(
  urlRpc: string,
  transactionPacket: TransactionPacket,
) {
  const signing = transactionExtractSigning(transactionPacket);
  const message = transactionExtractMessage(transactionPacket);
  return computeUrl(urlRpc, "tx", "inspector", {
    signatures: JSON.stringify(
      signing.map(({ signature }) => signatureToBase58(signature)),
    ),
    message: base64Encode(message as Uint8Array),
  });
}

function computeUrl(
  urlRpc: string,
  category: string,
  payload: string,
  params: Record<string, string>,
) {
  const args = [];
  for (const [key, value] of Object.entries(params)) {
    args.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  }
  if (
    urlRpc === urlPublicRpcMainnet ||
    urlRpc === "mainnet" ||
    urlRpc === "mainnet-beta"
  ) {
    args.push("cluster=mainnet-beta");
  } else if (urlRpc === urlPublicRpcDevnet || urlRpc === "devnet") {
    args.push("cluster=devnet");
  } else if (urlRpc === urlPublicRpcTestnet || urlRpc === "testnet") {
    args.push("cluster=testnet");
  } else {
    args.push(`customUrl=${encodeURIComponent(urlRpc)}`);
  }
  return `https://explorer.solana.com/${category}/${payload}?${args.join("&")}`;
}
