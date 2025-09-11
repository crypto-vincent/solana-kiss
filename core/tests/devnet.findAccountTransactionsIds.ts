import { expect, it } from '@jest/globals';
import { rpcFromUrl } from '../src';
import { findAccountTransactionsIds } from '../src/findAccountTransactionsIds';

it('run', async () => {
  let rpc = rpcFromUrl('https://api.devnet.solana.com');

  let result = await findAccountTransactionsIds(
    rpc,
    'vVeH6Xd43HAScbxjVtvfwDGqBMaMvNDLsAxwM5WK1pG',
    4200,
  );
  console.log('result', result);
});
