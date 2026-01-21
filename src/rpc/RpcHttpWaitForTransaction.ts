import {
  TransactionExecution,
  TransactionFlow,
  TransactionHandle,
  TransactionRequest,
} from "../data/Transaction";
import { RpcHttp } from "./RpcHttp";
import { rpcHttpGetTransaction } from "./RpcHttpGetTransaction";

export async function rpcHttpWaitForTransaction(
  self: RpcHttp,
  transactionHandle: TransactionHandle,
  retryApprover: (context: {
    transactionHandle: TransactionHandle;
    retriedCounter: number;
    totalDurationMs: number;
  }) => Promise<boolean>,
): Promise<{
  transactionRequest: TransactionRequest;
  transactionExecution: TransactionExecution;
  transactionFlow: TransactionFlow | undefined;
}> {
  const startTime = Date.now();
  let retriedCounter = 0;
  while (true) {
    const response = await rpcHttpGetTransaction(self, transactionHandle);
    if (response !== undefined) {
      return response;
    }
    const totalDurationMs = Date.now() - startTime;
    const retryApproved = await retryApprover({
      transactionHandle,
      retriedCounter,
      totalDurationMs,
    });
    if (!retryApproved) {
      throw new Error(
        `RpcHttp: Transaction not found: ${transactionHandle} (after ${retriedCounter} retries, ${totalDurationMs}ms)`,
      );
    }
    retriedCounter++;
  }
}
