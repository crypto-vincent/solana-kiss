import { Signature } from "../data/Signature";
import { Transaction } from "../data/Transaction";
import { RpcHttp } from "./RpcHttp";
import { rpcHttpGetTransaction } from "./RpcHttpGetTransaction";

export async function rpcHttpWaitForTransaction(
  rpcHttp: RpcHttp,
  transactionSignature: Signature,
  timeoutMs: number,
): Promise<Transaction> {
  const start = Date.now();
  while (true) {
    const transaction = await rpcHttpGetTransaction(
      rpcHttp,
      transactionSignature,
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
