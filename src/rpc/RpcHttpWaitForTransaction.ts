import { ExecutionFlow, ExecutionReport } from "../data/Execution";
import { TransactionHandle, TransactionRequest } from "../data/Transaction";
import { RpcHttp } from "./RpcHttp";
import { rpcHttpGetTransaction } from "./RpcHttpGetTransaction";

/**
 * Polls for a transaction until it is confirmed on-chain or the retry approver rejects further attempts.
 *
 * The `retryApprover` callback is invoked each time the transaction is not yet found; returning `true`
 * triggers another attempt, while returning `false` throws an error.
 *
 * @param self - The {@link RpcHttp} client to use.
 * @param transactionHandle - The {@link TransactionHandle} (signature) of the transaction to wait for.
 * @param retryApprover - Async callback invoked when the transaction is not yet found, receiving context about
 *   the current wait. Return `true` to keep polling or `false` to abort with an error.
 * @param options - Optional options forwarded to {@link rpcHttpGetTransaction}.
 * @param options.skipExecutionFlow - When `true`, skips parsing the program invocation call-stack.
 * @returns An object containing `transactionRequest` ({@link TransactionRequest}),
 *   `executionReport` ({@link ExecutionReport}), and `executionFlow` ({@link ExecutionFlow} or `undefined`)
 *   once the transaction is confirmed.
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
  options?: { skipExecutionFlow?: boolean },
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
