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

// TODO (naming) - better naming standards ?

export function explorerUrlAccount(rpcUrl: string, address: Pubkey) {
  return computeUrl(rpcUrl, "address", pubkeyToBase58(address), {});
}

export function explorerUrlBlock(rpcUrl: string, blockSlot: BlockSlot) {
  return computeUrl(rpcUrl, "block", blockSlot.toString(), {});
}

export function explorerUrlTransaction(
  rpcUrl: string,
  transactionHandle: TransactionHandle,
) {
  return computeUrl(rpcUrl, "tx", signatureToBase58(transactionHandle), {});
}

export function explorerUrlSimulation(
  rpcUrl: string,
  transactionPacket: TransactionPacket,
) {
  const signing = transactionExtractSigning(transactionPacket);
  const message = transactionExtractMessage(transactionPacket);
  return computeUrl(rpcUrl, "tx", "inspector", {
    signatures: JSON.stringify(
      signing.map(({ signature }) => signatureToBase58(signature)),
    ),
    message: base64Encode(message as Uint8Array),
  });
}

function computeUrl(
  rpcUrl: string,
  category: string,
  payload: string,
  params: Record<string, string>,
) {
  const args = [];
  for (const [key, value] of Object.entries(params)) {
    args.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  }
  if (
    rpcUrl === "https://api.mainnet-beta.solana.com" ||
    rpcUrl === "mainnet" ||
    rpcUrl === "mainnet-beta"
  ) {
    args.push("cluster=mainnet-beta");
  } else if (
    rpcUrl === "https://api.devnet.solana.com" ||
    rpcUrl === "devnet"
  ) {
    args.push("cluster=devnet");
  } else if (
    rpcUrl === "https://api.testnet.solana.com" ||
    rpcUrl === "testnet"
  ) {
    args.push("cluster=testnet");
  } else {
    args.push(`customUrl=${encodeURIComponent(rpcUrl)}`);
  }
  return `https://explorer.solana.com/${category}/${payload}?${args.join("&")}`;
}
