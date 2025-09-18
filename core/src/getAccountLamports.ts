import { Commitment, Lamports, PublicKey, RpcHttp, Slot } from './types';
import { expectJsonNumberFromObject, expectJsonObject } from './json';

export async function getAccountLamports(
  rpcHttp: RpcHttp,
  accountAddress: PublicKey,
  context?: {
    commitment?: Commitment;
    minSlot?: Slot;
  },
): Promise<Lamports> {
  const result = expectJsonObject(
    await rpcHttp('getBalance', [
      accountAddress,
      {
        commitment: context?.commitment,
        minContextSlot: context?.minSlot,
        encoding: 'base64',
      },
    ]),
  );
  const value = expectJsonNumberFromObject(result, 'value');
  return String(value);
}
