import { expect, it } from '@jest/globals';
import { rpcFromUrl } from '../src';
import { findProgramAccountsAddresses } from '../src/findProgramAccountsAddresses';

it('run', async () => {
  let rpc = rpcFromUrl('https://api.devnet.solana.com');

  let result = await findProgramAccountsAddresses(
    rpc,
    'vVeH6Xd43HAScbxjVtvfwDGqBMaMvNDLsAxwM5WK1pG',
  );
  console.log('result', result);
});
