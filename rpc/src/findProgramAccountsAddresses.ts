import { Commitment, PublicKey, Rpc, Slot } from './types';
import { enforceArray, enforceObject, enforceString } from './utils';

export async function findProgramAccountsAddresses(
  rpc: Rpc,
  programAddress: PublicKey,
  context?: {
    commitment?: Commitment;
    minSlot?: Slot;
  },
): Promise<Set<PublicKey>> {
  const value = enforceArray(
    await rpc('getProgramAccounts', [
      programAddress,
      {
        commitment: context?.commitment,
        minContextSlot: context?.minSlot,
        dataSlice: { offset: 0, length: 0 },
        encoding: 'base64',
        withContext: true,
      },
    ]),
  );
  const addresses = new Set<PublicKey>();
  for (let item of value) {
    const obj = enforceObject(item);
    addresses.add(enforceString(obj.pubkey));
  }
  return addresses;
}
