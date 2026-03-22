import { base64Encode } from "../data/Base64";
import { jsonCodecTransactionHandle } from "../data/Json";
import {
  TransactionHandle,
  TransactionPacket,
  transactionPacketToBytes,
} from "../data/Transaction";
import { RpcHttp } from "./RpcHttp";

/**
 * Sends a signed transaction to the Solana network.
 * @param self - {@link RpcHttp} client.
 * @param transactionPacket - Transaction to broadcast.
 * @param options.skipPreflight - Skip preflight simulation.
 * @returns `{ transactionHandle }`.
 */
export async function rpcHttpSendTransaction(
  self: RpcHttp,
  transactionPacket: TransactionPacket,
  options?: { skipPreflight?: boolean },
): Promise<{ transactionHandle: TransactionHandle }> {
  const transactionHandle = jsonCodecTransactionHandle.decoder(
    await self(
      "sendTransaction",
      [base64Encode(transactionPacketToBytes(transactionPacket))],
      { skipPreflight: options?.skipPreflight, encoding: "base64" },
    ),
  );
  return { transactionHandle };
}
