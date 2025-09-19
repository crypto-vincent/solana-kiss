import { Commitment, PublicKey, Slot } from './types';
import {
  jsonExpectObject,
  jsonExpectArrayFromObject,
  jsonExpectStringFromObject,
} from './json';
import { RpcHttp } from './rpc';

export async function findProgramAccountsAddresses(
  rpcHttp: RpcHttp,
  programAddress: PublicKey,
  context?: {
    commitment?: Commitment;
    minSlot?: Slot;
  },
): Promise<Set<PublicKey>> {
  const result = jsonExpectObject(
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
  for (let item of jsonExpectArrayFromObject(result, 'value')) {
    addresses.add(jsonExpectStringFromObject(jsonExpectObject(item), 'pubkey'));
  }
  return addresses;
}
