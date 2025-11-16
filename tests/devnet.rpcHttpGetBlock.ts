import { expect, it } from "@jest/globals";
import {
  blockSlotFromNumber,
  rpcHttpFromUrl,
  rpcHttpGetBlockMetadata,
  rpcHttpGetBlockTimeOnly,
  rpcHttpGetBlockWithTransactions,
  urlRpcPublicDevnet,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl(urlRpcPublicDevnet);
  const blockSlot = blockSlotFromNumber(378967387);
  const metadata = await rpcHttpGetBlockMetadata(rpcHttp, blockSlot);
  expect(metadata.previousBlockSlot).toStrictEqual(378967386);
  expect(metadata.blockHash).toStrictEqual(
    "2SS9WkNqMdHkY8iki5CvzjeBkbiXSsDE2zY4oZHv7fDM",
  );
  expect(metadata.blockHeight).toStrictEqual(366940433);
  expect(metadata.blockTime?.toISOString()).toStrictEqual(
    "2025-05-06T02:42:34.000Z",
  );
  const withTransaction = await rpcHttpGetBlockWithTransactions(
    rpcHttp,
    blockSlot,
  );
  expect(withTransaction.previousBlockSlot).toStrictEqual(
    metadata.previousBlockSlot,
  );
  expect(withTransaction.blockHeight).toStrictEqual(metadata.blockHeight);
  expect(withTransaction.blockTime).toStrictEqual(metadata.blockTime);
  expect(withTransaction.blockHash).toStrictEqual(metadata.blockHash);
  expect(withTransaction.oldToNewTransactionsHandles.length).toStrictEqual(17);
  expect(withTransaction.oldToNewTransactionsHandles[0]).toStrictEqual(
    "3g4afiLu3KW1G2eYhvP1h3aKx2Pp54CCtqZTRX9q7daY84TQ6RcKMERNk56QJPi5CrhV5dYTHJzSrk6z4aLWKKrd",
  );
  const timeOnly = await rpcHttpGetBlockTimeOnly(rpcHttp, blockSlot);
  expect(timeOnly.blockTime).toStrictEqual(metadata.blockTime);
});
