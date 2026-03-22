import { ExecutionFlow, ExecutionReport } from "../data/Execution";
import { TransactionHandle, TransactionRequest } from "../data/Transaction";
import { RpcHttp } from "./RpcHttp";
import { rpcHttpGetTransaction } from "./RpcHttpGetTransaction";

/**
 * Polls until a transaction is confirmed or `retryApprover` returns `false`.
 * @param self - {@link RpcHttp} client.
 * @param transactionHandle - Transaction signature to wait for.
 * @param retryApprover - Called each poll; return `true` to retry, `false` to abort.
 * @param options.skipExecutionFlowParsing - Skip parsing the invocation call-stack.
 * @returns `{ transactionRequest, executionReport, executionFlow }` once confirmed.
 * @throws If the retry approver returns `false`.
 */
export async function rpcHttpWaitForTransaction(
  self: RpcHttp,
  transactionHandle: TransactionHandle,
  retryApprover: (context: {
    transactionHandle: TransactionHandle;
    retriedCounter: number;
    totalDurationMs: number;
  }) => Promise<boolean>,
  options?: { skipExecutionFlowParsing?: boolean },
): Promise<{
  transactionRequest: TransactionRequest;
  executionReport: ExecutionReport;
  executionFlow: ExecutionFlow | undefined;
}> {
  const startTime = Date.now();
  let retriedCounter = 0;
  while (true) {
    const response = await rpcHttpGetTransaction(
      self,
      transactionHandle,
      options,
    );
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
