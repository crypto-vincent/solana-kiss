import { base64Encode } from "../data/Base64";
import { jsonCodecSignature } from "../data/Json";
import { TransactionHandle, TransactionPacket } from "../data/Transaction";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpSendTransaction(
  self: RpcHttp,
  transactionPacket: TransactionPacket,
  options?: {
    skipPreflight?: boolean;
  },
): Promise<{ transactionHandle: TransactionHandle }> {
  const transactionHandle = jsonCodecSignature.decoder(
    await self(
      "sendTransaction",
      [base64Encode(transactionPacket as Uint8Array)],
      { skipPreflight: options?.skipPreflight, encoding: "base64" },
    ),
  );
  return { transactionHandle };
}
