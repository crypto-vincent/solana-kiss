import { expect, it } from "@jest/globals";
import {
  rpcHttpGetBlockMetadata,
  rpcHttpGetBlockWithTransactions,
} from "../src";

it("run", async () => {
  const {
    previousBlockSlot: metadataPreviousBlockSlot,
    blockInfo: metadataBlockInfo,
  } = await rpcHttpGetBlockMetadata(
    () => require("./fixtures/RpcHttpGetBlock.json"),
    null as any,
  );
  expect(metadataPreviousBlockSlot).toStrictEqual(378967387);
  expect(metadataBlockInfo.hash).toStrictEqual(
    "CFPsud8DsrxUJGs5WjnB1jbqBCajYXJtuEmBfPUNXBh3",
  );
  expect(metadataBlockInfo.height).toStrictEqual(366940434);
  expect(metadataBlockInfo.time?.toISOString()).toStrictEqual(
    "2025-05-06T02:42:34.000Z",
  );
  const {
    previousBlockSlot: withTransactionPreviousBlockSlot,
    blockInfo: withTransactionBlockInfo,
    transactionsHandles,
  } = await rpcHttpGetBlockWithTransactions(
    () => require("./fixtures/RpcHttpGetBlock.json"),
    null as any,
  );
  expect(withTransactionPreviousBlockSlot).toStrictEqual(
    metadataPreviousBlockSlot,
  );
  expect(withTransactionBlockInfo).toStrictEqual(metadataBlockInfo);
  expect(transactionsHandles.length).toStrictEqual(44);
  expect(transactionsHandles[0]).toStrictEqual(
    "2ekepJV7psmVsBsWhFRw9JeSMpqzemtR2F3kFxTQ5uHYEEFto7FsZAVnhzAwhP9sgJwDukcmLYRUT7m9DGgt6sq8",
  );
});
