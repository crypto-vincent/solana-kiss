import { Signature } from "../data/Signature";
import {
  TransactionCallStack,
  TransactionExecution,
  TransactionRequest,
} from "../data/Transaction";
import { RpcHttp } from "./RpcHttp";
import { rpcHttpGetTransaction } from "./RpcHttpGetTransaction";

export async function rpcHttpWaitForTransaction(
  rpcHttp: RpcHttp,
  transactionId: Signature,
  retryApprover: (context: {
    retriedCounter: number;
    totalDurationMs: number;
  }) => Promise<boolean>,
): Promise<{
  transactionRequest: TransactionRequest;
  transactionExecution: TransactionExecution;
  transactionCallStack: TransactionCallStack | undefined;
}> {
  const startTime = Date.now();
  let retriedCounter = 0;
  while (true) {
    const response = await rpcHttpGetTransaction(rpcHttp, transactionId);
    if (response !== undefined) {
      return response;
    }
    const totalDurationMs = Date.now() - startTime;
    const retryApproved = await retryApprover({
      retriedCounter,
      totalDurationMs,
    });
    if (!retryApproved) {
      throw new Error(
        `RpcHttp: Transaction not found: ${transactionId} (after ${retriedCounter} retries, ${totalDurationMs}ms)`,
      );
    }
    retriedCounter++;
  }
}
