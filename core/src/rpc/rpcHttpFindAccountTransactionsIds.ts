import { jsonTypeArray, jsonTypeObject, jsonTypeString } from "../data/json";
import { Commitment, PublicKey, Signature } from "../types";
import { RpcHttp } from "./rpcHttp";

export async function rpcHttpFindAccountTransactionsIds(
  rpcHttp: RpcHttp,
  accountAddress: PublicKey,
  maxLength: number,
  pagination?: {
    startBeforeTransactionId?: Signature;
    rewindUntilTransactionId?: Signature;
  },
  context?: {
    commitment?: Commitment;
  },
): Promise<Array<Signature>> {
  const transactionsIds = new Array<Signature>();
  const rewindUntilTransactionId = pagination?.rewindUntilTransactionId;
  let startBeforeTransactionId = pagination?.startBeforeTransactionId;
  let requestCounter = 0;
  while (true) {
    const batchSize = Math.min(
      1000,
      rewindUntilTransactionId ? (requestCounter == 0 ? 10 : 1000) : maxLength,
    );
    requestCounter++;
    const result = resultJsonType.decode(
      await rpcHttp("getSignaturesForAddress", [
        accountAddress,
        {
          limit: batchSize,
          before: startBeforeTransactionId,
          commitment: context?.commitment,
        },
      ]),
    );
    for (const item of result) {
      const transactionId = item.signature;
      transactionsIds.push(transactionId);
      if (transactionsIds.length >= maxLength) {
        return transactionsIds;
      }
      if (
        rewindUntilTransactionId &&
        transactionId == rewindUntilTransactionId
      ) {
        return transactionsIds;
      }
      startBeforeTransactionId = transactionId;
    }
    if (result.length < batchSize) {
      return transactionsIds;
    }
  }
}

const resultJsonType = jsonTypeArray(
  jsonTypeObject({
    signature: jsonTypeString(),
  }),
);
