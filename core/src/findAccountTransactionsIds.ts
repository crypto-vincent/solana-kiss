import { Commitment, PublicKey, Rpc, Signature, Slot } from './types';
import { enforceArray, enforceObject, enforceString } from './utils';

export async function findAccountTransactionsIds(
  rpc: Rpc,
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
  const stopAtTransactionId = pagination?.rewindUntilTransactionId;
  let startFromTransactionId = pagination?.startBeforeTransactionId;
  let retries = 0;
  while (true) {
    let batchSize = Math.min(
      1000,
      stopAtTransactionId ? (retries == 0 ? 10 : 1000) : maxLength,
    );
    retries++;
    const value = enforceArray(
      await rpc('getSignaturesForAddress', [
        accountAddress,
        {
          limit: batchSize,
          before: startFromTransactionId,
          commitment: context?.commitment,
          minContextSlot: context?.minSlot,
        },
      ]),
    );
    if (value.length === 0) {
      return transactionsIds;
    }
    for (let item of value) {
      const signature = enforceString(enforceObject(item)['signature']);
      transactionsIds.push(signature);
      if (transactionsIds.length >= maxLength) {
        return transactionsIds;
      }
      if (stopAtTransactionId && signature == stopAtTransactionId) {
        return transactionsIds;
      }
      startFromTransactionId = signature;
    }
  }
}
