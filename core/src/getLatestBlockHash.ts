import { Commitment, Hash, RpcHttp, Slot } from './types';
import {
  expectJsonObjectFromObject,
  expectJsonObject,
  expectJsonStringFromObject,
} from './json';

export async function getLatestBlockHash(
  rpcHttp: RpcHttp,
  context?: {
    commitment?: Commitment;
    minSlot?: Slot; // TODO - check the context params are valid in all cases
  },
): Promise<Hash> {
  const result = expectJsonObject(
    await rpcHttp('getLatestBlockhash', [
      {
        commitment: context?.commitment,
        minContextSlot: context?.minSlot,
      },
    ]),
  );
  const value = expectJsonObjectFromObject(result, 'value');
  return expectJsonStringFromObject(value, 'blockhash');
}
