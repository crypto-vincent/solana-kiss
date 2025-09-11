import { Commitment, Lamports, PublicKey, Rpc, Slot } from './types';
import {
  enforceObject,
  enforceBoolean,
  enforceNumber,
  enforceString,
} from './utils';

export async function getAccountMetadata(
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
  space: number;
}> {
  const value = enforceObject(
    await rpc('getAccountInfo', [
      accountAddress,
      {
        commitment: context?.commitment,
        minContextSlot: context?.minSlot,
        dataSlice: { offset: 0, length: 0 },
        encoding: 'base64',
      },
    ]),
  );
  const executable = enforceBoolean(value.executable);
  const lamports = BigInt(enforceNumber(value.lamports));
  const owner = enforceString(value.owner);
  const space = enforceNumber(value.space);
  return {
    executable,
    lamports,
    owner,
    space,
  };
}
