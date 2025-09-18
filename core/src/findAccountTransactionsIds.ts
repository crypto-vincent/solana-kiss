import { Commitment, PublicKey, RpcHttp, Signature, Slot } from './types';
import {
  expectJsonArray,
  expectJsonObject,
  expectJsonStringFromObject,
} from './json';

export async function findAccountTransactionsIds(
  rpcHttp: RpcHttp,
  accountAddress: PublicKey,
  maxLength: number,
  pagination?: {
    startBeforeTransactionId?: Signature;
    rewindUntilTransactionId?: Signature;
  },
  context?: {
    commitment?: Commitment;
    minSlot?: Slot;
  },
): Promise<Array<Signature>> {
  const transactionsIds = new Array<Signature>();
  const rewindUntilTransactionId = pagination?.rewindUntilTransactionId;
  let startBeforeTransactionId = pagination?.startBeforeTransactionId;
  let requestCount = 0;
  while (true) {
    let batchSize = Math.min(
      1000,
      rewindUntilTransactionId ? (requestCount == 0 ? 10 : 1000) : maxLength,
    );
    requestCount++;
    const result = expectJsonArray(
      await rpcHttp('getSignaturesForAddress', [
        accountAddress,
        {
          limit: batchSize,
          before: startBeforeTransactionId,
          commitment: context?.commitment,
          minContextSlot: context?.minSlot,
        },
      ]),
    );
    if (result.length === 0) {
      return transactionsIds;
    }
    for (let item of result) {
      const transactionId = expectJsonStringFromObject(
        expectJsonObject(item),
        'signature',
      );
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
  }
}
