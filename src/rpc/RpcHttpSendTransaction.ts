import { base64Encode } from "../data/Base64";
import { jsonCodecSignature } from "../data/Json";
import { TransactionId, TransactionPacket } from "../data/Transaction";
import { RpcHttp } from "./RpcHttp";

// TODO (service) - provide a higher level function that handle block hash and wait for confirmation
export async function rpcHttpSendTransaction(
  rpcHttp: RpcHttp,
  transactionPacket: TransactionPacket,
  options?: { skipPreflight?: boolean },
): Promise<{ transactionId: TransactionId }> {
  const transactionId = jsonCodecSignature.decoder(
    await rpcHttp(
      "sendTransaction",
      [base64Encode(transactionPacket as Uint8Array)],
      { skipPreflight: options?.skipPreflight, encoding: "base64" },
    ),
  );
  return { transactionId };
}
