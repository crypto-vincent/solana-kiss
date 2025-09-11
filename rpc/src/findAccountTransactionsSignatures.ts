import { Commitment, PublicKey, Rpc, Signature, Slot } from './types';
import { enforceArray, enforceObject, enforceString } from './utils';

export async function findAccountTransactionsSignatures(
  rpc: Rpc,
  accountAddress: PublicKey,
  maxLength: number,
  pagination?: {
    startBefore?: Signature;
    rewindUntil?: Signature;
  },
  context?: {
    commitment?: Commitment;
    minSlot?: Slot;
  },
): Promise<Array<Signature>> {
  const signatures = new Array<Signature>();
  const stopAtSignature = pagination?.rewindUntil;
  let startFromSignature = pagination?.startBefore;
  let retries = 0;
  while (true) {
    let batchSize = Math.min(
      1000,
      stopAtSignature ? maxLength : retries == 0 ? 10 : 1000,
    );
    retries++;
    const value = enforceArray(
      await rpc('getSignaturesForAddress', [
        accountAddress,
        {
          limit: batchSize,
          before: startFromSignature,
          commitment: context?.commitment,
          minContextSlot: context?.minSlot,
        },
      ]),
    );
    console.log('value', value);
    if (value.length === 0) {
      return signatures;
    }
    for (let item of value) {
      const signature = enforceString(enforceObject(item).signature);
      signatures.push(signature);
      if (signatures.length >= maxLength) {
        return signatures;
      }
      if (stopAtSignature && signature == stopAtSignature) {
        return signatures;
      }
      startFromSignature = signature;
    }
  }
}
