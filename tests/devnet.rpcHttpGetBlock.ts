import { it } from "@jest/globals";
import {
  blockSlotFromNumber,
  rpcHttpFromUrl,
  rpcHttpGetBlockTransactions,
} from "../src";
import { rpcHttpGetBlockMetadata } from "../src/rpc/RpcHttpGetBlockMetadata";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");
  const { blockInfo, parentBlockSlot } = await rpcHttpGetBlockMetadata(
    rpcHttp,
    blockSlotFromNumber(378967387),
  );
  expect(parentBlockSlot).toStrictEqual(378967386);
  expect(blockInfo.hash).toStrictEqual(
    "2SS9WkNqMdHkY8iki5CvzjeBkbiXSsDE2zY4oZHv7fDM",
  );
  expect(blockInfo.height).toStrictEqual(366940433);
  expect(blockInfo.time?.toISOString()).toStrictEqual(
    "2025-05-06T02:42:34.000Z",
  );
  const { transactionsIds } = await rpcHttpGetBlockTransactions(
    rpcHttp,
    blockSlotFromNumber(378967387),
  );
  expect(transactionsIds.length).toStrictEqual(17);
  expect(transactionsIds[0]).toStrictEqual(
    "3g4afiLu3KW1G2eYhvP1h3aKx2Pp54CCtqZTRX9q7daY84TQ6RcKMERNk56QJPi5CrhV5dYTHJzSrk6z4aLWKKrd",
  );
});
