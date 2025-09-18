import { Commitment, PublicKey, RpcHttp, Slot } from './types';
import {
  expectJsonObject,
  expectJsonArrayFromObject,
  expectJsonStringFromObject,
} from './json';

export async function findProgramAccountsAddresses(
  rpcHttp: RpcHttp,
  programAddress: PublicKey,
  context?: {
    commitment?: Commitment;
    minSlot?: Slot;
  },
): Promise<Set<PublicKey>> {
  const result = expectJsonObject(
    await rpcHttp('getProgramAccounts', [
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
  for (let item of expectJsonArrayFromObject(result, 'value')) {
    addresses.add(expectJsonStringFromObject(expectJsonObject(item), 'pubkey'));
  }
  return addresses;
}
