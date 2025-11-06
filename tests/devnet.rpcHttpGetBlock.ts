import { expect, it } from "@jest/globals";
import {
  blockSlotFromNumber,
  rpcHttpFromUrl,
  rpcHttpGetBlockMetadata,
  rpcHttpGetBlockTime,
  rpcHttpGetBlockWithTransactions,
  urlRpcPublicDevnet,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl(urlRpcPublicDevnet);
  const blockSlot = blockSlotFromNumber(378967387);
  const {
    previousBlockSlot: metadataPreviousBlockSlot,
    blockInfo: metadataBlockInfo,
  } = await rpcHttpGetBlockMetadata(rpcHttp, blockSlot);
  expect(metadataPreviousBlockSlot).toStrictEqual(378967386);
  expect(metadataBlockInfo.hash).toStrictEqual(
    "2SS9WkNqMdHkY8iki5CvzjeBkbiXSsDE2zY4oZHv7fDM",
  );
  expect(metadataBlockInfo.height).toStrictEqual(366940433);
  expect(metadataBlockInfo.time?.toISOString()).toStrictEqual(
    "2025-05-06T02:42:34.000Z",
  );
  const {
    previousBlockSlot: withTransactionPreviousBlockSlot,
    blockInfo: withTransactionBlockInfo,
    transactionsHandles,
  } = await rpcHttpGetBlockWithTransactions(rpcHttp, blockSlot);
  expect(withTransactionPreviousBlockSlot).toStrictEqual(
    metadataPreviousBlockSlot,
  );
  expect(withTransactionBlockInfo).toStrictEqual(metadataBlockInfo);
  expect(transactionsHandles.length).toStrictEqual(17);
  expect(transactionsHandles[0]).toStrictEqual(
    "3g4afiLu3KW1G2eYhvP1h3aKx2Pp54CCtqZTRX9q7daY84TQ6RcKMERNk56QJPi5CrhV5dYTHJzSrk6z4aLWKKrd",
  );
  const { blockInfo: dateBlockInfo } = await rpcHttpGetBlockTime(
    rpcHttp,
    blockSlot,
  );
  expect(dateBlockInfo?.time?.toISOString()).toStrictEqual(
    "2025-05-06T02:42:34.000Z",
  );
});
