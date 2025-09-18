import { Commitment, Lamports, PublicKey, RpcHttp, Slot } from './types';
import {
  expectJsonObject,
  expectJsonBooleanFromObject,
  expectJsonNumberFromObject,
  expectJsonObjectFromObject,
  expectJsonStringFromObject,
} from './json';

export async function getAccountMetadata(
  rpcHttp: RpcHttp,
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
  const result = expectJsonObject(
    await rpcHttp('getAccountInfo', [
      accountAddress,
      {
        commitment: context?.commitment,
        minContextSlot: context?.minSlot,
        dataSlice: { offset: 0, length: 0 },
        encoding: 'base64',
      },
    ]),
  );
  const value = expectJsonObjectFromObject(result, 'value');
  const executable = expectJsonBooleanFromObject(value, 'executable');
  const lamports = String(expectJsonNumberFromObject(value, 'lamports'));
  const owner = expectJsonStringFromObject(value, 'owner');
  const space = expectJsonNumberFromObject(value, 'space');
  return {
    executable,
    lamports,
    owner,
    space,
  };
}
