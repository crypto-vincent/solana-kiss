import { base64Encode } from "../data/Base64";
import { jsonCodecSignature } from "../data/Json";
import {
  transactionExtractSigning,
  TransactionHandle,
  TransactionPacket,
} from "../data/Transaction";
import { RpcHttp, RpcHttpError } from "./RpcHttp";

export async function rpcHttpSendTransaction(
  self: RpcHttp,
  transactionPacket: TransactionPacket,
  options?: {
    skipPreflight?: boolean;
    failOnAlreadyProcessed?: boolean;
  },
): Promise<{ transactionHandle: TransactionHandle }> {
  try {
    const transactionHandle = jsonCodecSignature.decoder(
      await self(
        "sendTransaction",
        [base64Encode(transactionPacket as Uint8Array)],
        { skipPreflight: options?.skipPreflight, encoding: "base64" },
      ),
    );
    return { transactionHandle };
  } catch (error) {
    if (options?.failOnAlreadyProcessed !== true) {
      if (
        error instanceof RpcHttpError &&
        error.code === -32002 &&
        (error.data as any).err === "AlreadyProcessed"
      ) {
        const transactionSigning = transactionExtractSigning(transactionPacket);
        const transactionHandle = transactionSigning[0]!.signature;
        return { transactionHandle };
      }
    }
    throw error;
  }
}
