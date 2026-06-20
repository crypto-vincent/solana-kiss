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
  const onlyMetadata = await rpcHttpGetBlockMetadata(rpcHttp, blockSlot);
  expect(onlyMetadata.previousBlockSlot).toStrictEqual(378967386);
  expect(onlyMetadata.blockHash).toStrictEqual(
    "2SS9WkNqMdHkY8iki5CvzjeBkbiXSsDE2zY4oZHv7fDM",
  );
  expect(onlyMetadata.blockHeight).toStrictEqual(366940433);
  expect(onlyMetadata.blockTime?.toISOString()).toStrictEqual(
    "2025-05-06T02:42:34.000Z",
  );
  const withTransactions = await rpcHttpGetBlockWithTransactions(
    rpcHttp,
    blockSlot,
  );
  expect(withTransactions.previousBlockSlot).toStrictEqual(
    onlyMetadata.previousBlockSlot,
  );
  expect(withTransactions.blockHeight).toStrictEqual(onlyMetadata.blockHeight);
  expect(withTransactions.blockTime).toStrictEqual(onlyMetadata.blockTime);
  expect(withTransactions.blockHash).toStrictEqual(onlyMetadata.blockHash);
  expect(withTransactions.oldToNewTransactionsHandles.length).toStrictEqual(17);
  expect(withTransactions.oldToNewTransactionsHandles[0]).toStrictEqual(
    "3g4afiLu3KW1G2eYhvP1h3aKx2Pp54CCtqZTRX9q7daY84TQ6RcKMERNk56QJPi5CrhV5dYTHJzSrk6z4aLWKKrd",
  );
  const timeOnly = await rpcHttpGetBlockTimeOnly(rpcHttp, blockSlot);
  expect(timeOnly.blockTime).toStrictEqual(onlyMetadata.blockTime);
});
