import { Commitment, Hash, Rpc, Slot } from './types';
import { enforceObject, enforceString } from './utils';

export async function getLatestBlockHash(
  rpc: Rpc,
  context?: {
    commitment?: Commitment;
    minSlot?: Slot;
  },
): Promise<Hash> {
  const result = enforceObject(
    await rpc('getLatestBlockhash', [
      {
        commitment: context?.commitment,
        minContextSlot: context?.minSlot,
      },
    ]),
  );
  const value = enforceObject(result.value);
  return enforceString(value.blockhash);
}
