import { Signature } from "../data/Signature";
import { RpcHttp } from "./RpcHttp";
import { rpcHttpGetTransaction } from "./RpcHttpGetTransaction";
import {
  RpcTransactionCallStack,
  RpcTransactionExecution,
} from "./RpcTransaction";

export async function rpcHttpWaitForTransaction(
  rpcHttp: RpcHttp,
  transactionId: Signature,
  timeoutMs: number,
): Promise<{
  transactionExecution: RpcTransactionExecution;
  transactionCallStack: RpcTransactionCallStack | undefined;
}> {
  const start = Date.now();
  while (true) {
    const response = await rpcHttpGetTransaction(rpcHttp, transactionId);
    if (response !== undefined) {
      return response;
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(
        `RpcHttp: Timeout waiting for transaction: ${transactionId} (${timeoutMs}ms)`,
      );
    }
  }
}
