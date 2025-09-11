import { base64Decode } from './base64';
import { Commitment, Lamports, PublicKey, Rpc, Slot } from './types';
import {
  enforceArray,
  enforceBoolean,
  enforceNumber,
  enforceObject,
  enforceString,
} from './utils';

export async function getAccount(
  rpc: Rpc,
  accountAddress: PublicKey,
  context?: {
    commitment?: Commitment;
    minSlot?: Slot;
  },
): Promise<{
  executable: boolean;
  lamports: Lamports;
  owner: PublicKey;
  data: Uint8Array;
}> {
  const result = enforceObject(
    await rpc('getAccountInfo', [
      accountAddress,
      {
        commitment: context?.commitment,
        minContextSlot: context?.minSlot,
        encoding: 'base64',
      },
    ]),
  );
  const value = enforceObject(result.value);
  const executable = enforceBoolean(value.executable);
  const lamports = BigInt(enforceNumber(value.lamports));
  const owner = enforceString(value.owner);
  const data = base64Decode(enforceString(enforceArray(value.data)[0]));
  return {
    executable,
    lamports,
    owner,
    data,
  };
}
