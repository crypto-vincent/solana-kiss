import { expect, it } from '@jest/globals';
import { rpcFromUrl, getLatestBlockHash } from '../src';

it('run', async () => {
  let rpc = rpcFromUrl('https://api.devnet.solana.com');

  let result1 = await getLatestBlockHash(rpc);
  console.log('result1', result1);
});
