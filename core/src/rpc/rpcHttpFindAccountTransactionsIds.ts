import { jsonTypeArray, jsonTypeObject, jsonTypeString } from "../data/json";
import { Pubkey } from "../data/pubkey";
import { Commitment, Signature } from "../types";
import { RpcHttp } from "./rpcHttp";

export async function rpcHttpFindAccountTransactionsIds(
  rpcHttp: RpcHttp,
  accountAddress: Pubkey,
  maxLength: number,
  pagination?: {
    startBeforeTransactionId?: Signature;
    rewindUntilTransactionId?: Signature;
  },
  context?: {
    commitment?: Commitment;
  },
): Promise<Array<Signature>> {
  const requestLimit = 1000;
  const transactionsIds = new Array<Signature>();
  const rewindUntilTransactionId = pagination?.rewindUntilTransactionId;
  let startBeforeTransactionId = pagination?.startBeforeTransactionId;
  while (true) {
    const result = resultJsonType.decode(
      await rpcHttp("getSignaturesForAddress", [
        accountAddress,
        {
          limit: requestLimit,
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
    if (result.length < requestLimit) {
      return transactionsIds;
    }
  }
}

const resultJsonType = jsonTypeArray(
  jsonTypeObject({
    signature: jsonTypeString(),
  }),
);
