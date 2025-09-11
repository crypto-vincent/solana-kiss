import { Commitment, Lamports, PublicKey, Rpc, Slot } from './types';
import { enforceNumber } from './utils';

export async function getAccountLamports(
  rpc: Rpc,
  accountAddress: PublicKey,
  context?: {
    commitment?: Commitment;
    minSlot?: Slot;
  },
): Promise<Lamports> {
  const value = enforceNumber(
    await rpc('getBalance', [
      accountAddress,
      {
        commitment: context?.commitment,
        minContextSlot: context?.minSlot,
        encoding: 'base64',
      },
    ]),
  );
  return BigInt(value);
}
