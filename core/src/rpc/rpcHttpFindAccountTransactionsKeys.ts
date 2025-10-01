import { jsonTypeArray, jsonTypeObject, jsonTypeString } from "../data/Json";
import { Pubkey } from "../data/Pubkey";
import { Commitment, Signature } from "../types";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpFindAccountTransactionsKeys(
  rpcHttp: RpcHttp,
  accountAddress: Pubkey,
  maxLength: number,
  pagination?: {
    startBeforeTransactionKey?: Signature;
    rewindUntilTransactionKey?: Signature;
  },
  context?: {
    commitment?: Commitment;
  },
): Promise<Array<Signature>> {
  const requestLimit = 1000;
  const transactionsKeys = new Array<Signature>();
  const rewindUntilTransactionKey = pagination?.rewindUntilTransactionKey;
  let startBeforeTransactionKey = pagination?.startBeforeTransactionKey;
  while (true) {
    const result = resultJsonType.decode(
      await rpcHttp("getSignaturesForAddress", [
        accountAddress,
        {
          limit: requestLimit,
          before: startBeforeTransactionKey,
          commitment: context?.commitment,
        },
      ]),
    );
    for (const item of result) {
      const transactionKey = item.signature;
      transactionsKeys.push(transactionKey);
      if (transactionsKeys.length >= maxLength) {
        return transactionsKeys;
      }
      if (
        rewindUntilTransactionKey &&
        transactionKey === rewindUntilTransactionKey
      ) {
        return transactionsKeys;
      }
      startBeforeTransactionKey = transactionKey;
    }
    if (result.length < requestLimit) {
      return transactionsKeys;
    }
  }
}

const resultJsonType = jsonTypeArray(
  jsonTypeObject({
    signature: jsonTypeString(),
  }),
);
