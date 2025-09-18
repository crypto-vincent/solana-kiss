import { base64Decode } from './base64';
import { Commitment, Lamports, PublicKey, RpcHttp, Slot } from './types';
import {
  expectJsonStringFromArray,
  expectJsonObject,
  expectJsonArrayFromObject,
  expectJsonBooleanFromObject,
  expectJsonNumberFromObject,
  expectJsonObjectFromObject,
  expectJsonStringFromObject,
} from './json';

export async function getAccount(
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
  data: Uint8Array;
}> {
  const result = expectJsonObject(
    await rpcHttp('getAccountInfo', [
      accountAddress,
      {
        commitment: context?.commitment,
        minContextSlot: context?.minSlot,
        encoding: 'base64',
      },
    ]),
  );
  const value = expectJsonObjectFromObject(result, 'value');
  const executable = expectJsonBooleanFromObject(value, 'executable');
  const lamports = String(expectJsonNumberFromObject(value, 'lamports'));
  const owner = expectJsonStringFromObject(value, 'owner');
  const data = base64Decode(
    expectJsonStringFromArray(expectJsonArrayFromObject(value, 'data'), 0),
  );
  return {
    executable,
    lamports,
    owner,
    data,
  };
}
