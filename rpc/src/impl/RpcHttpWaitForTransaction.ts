import { Signature } from "solana-kiss-data";
import { RpcHttp } from "./RpcHttp";
import { rpcHttpGetTransaction } from "./RpcHttpGetTransaction";
import { Commitment, Transaction } from "./RpcTypes";

export async function rpcHttpWaitForTransaction(
  rpcHttp: RpcHttp,
  transactionSignature: Signature,
  timeoutMs: number,
  context?: {
    commitment?: Commitment;
  },
): Promise<Transaction> {
  const start = Date.now();
  while (true) {
    const transaction = await rpcHttpGetTransaction(
      rpcHttp,
      transactionSignature,
      context,
    );
    if (transaction !== undefined) {
      return transaction;
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(
        `RpcHttp: Timeout waiting for transaction ${transactionSignature} (${timeoutMs}ms)`,
      );
    }
  }
}
