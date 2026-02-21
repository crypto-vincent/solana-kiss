import { base64Encode } from "../data/Base64";
import { jsonCodecSignature } from "../data/Json";
import { TransactionHandle, TransactionPacket } from "../data/Transaction";
import { RpcHttp } from "./RpcHttp";

/**
 * Sends a signed and serialized transaction to the Solana network.
 *
 * @param self - The {@link RpcHttp} client to use.
 * @param transactionPacket - The {@link TransactionPacket} to broadcast.
 * @param options - Optional send options.
 * @param options.skipPreflight - When `true`, skips the preflight simulation check before submission.
 * @returns An object containing `transactionHandle` ({@link TransactionHandle}), the signature of the submitted transaction.
 */
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
