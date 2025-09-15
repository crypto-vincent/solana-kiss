import { Commitment, Lamports, PublicKey, Rpc, Slot } from './types';
import { enforceNumber, enforceObject } from './utils';

export async function getAccountLamports(
  rpc: Rpc,
  accountAddress: PublicKey,
  context?: {
    commitment?: Commitment;
    minSlot?: Slot;
  },
): Promise<Lamports> {
  const result = enforceObject(
    await rpc('getBalance', [
      accountAddress,
      {
        commitment: context?.commitment,
        minContextSlot: context?.minSlot,
        encoding: 'base64',
      },
    ]),
  );
  const value = enforceNumber(result['value']);
  return BigInt(value);
}
