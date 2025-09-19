import { Commitment, Lamports, PublicKey, Slot } from './types';
import { jsonExpectNumberFromObject, jsonExpectObject } from './json';
import { RpcHttp } from './rpc';

export async function getAccountLamports(
  rpcHttp: RpcHttp,
  accountAddress: PublicKey,
  context?: {
    commitment?: Commitment;
    minSlot?: Slot;
  },
): Promise<Lamports> {
  const result = jsonExpectObject(
    await rpcHttp('getBalance', [
      accountAddress,
      {
        commitment: context?.commitment,
        minContextSlot: context?.minSlot,
        encoding: 'base64',
      },
    ]),
  );
  const value = jsonExpectNumberFromObject(result, 'value');
  return String(value);
}
