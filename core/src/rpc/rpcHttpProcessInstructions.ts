import { jsonTypeObject, jsonTypeString } from "../data/json";
import { Commitment, Execution, Instruction, Signature } from "../types";
import { RpcHttp } from "./rpcHttp";
import { rpcHttpGetTransactionExecution } from "./rpcHttpGetTransactionExecution";

export async function rpcHttpProcessInstructions(
  rpcHttp: RpcHttp,
  instructions: Array<Instruction>,
  context?: {
    commitment?: Commitment;
  },
): Promise<{
  transactionId: Signature;
  execution: Execution;
}> {
  const sendResult = sendResultJsonType.decode(
    await rpcHttp("sendTransaction", [
      [], // TODO - compile transaciton
      {
        commitment: context?.commitment,
      },
    ]),
  );
  const transactionId = sendResult.signature;
  while (true) {
    const execution = await rpcHttpGetTransactionExecution(
      rpcHttp,
      transactionId,
      context,
    );
    if (execution !== undefined) {
      return {
        transactionId,
        execution,
      };
    }
  }
}

const sendResultJsonType = jsonTypeObject({
  signature: jsonTypeString(),
});
