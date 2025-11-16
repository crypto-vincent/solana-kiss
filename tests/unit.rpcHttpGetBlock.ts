import { expect, it } from "@jest/globals";
import {
  rpcHttpGetBlockMetadata,
  rpcHttpGetBlockWithTransactions,
} from "../src";

function rpcHttp() {
  return require("./fixtures/RpcHttpGetBlock.json");
}

it("run", async () => {
  const metadata = await rpcHttpGetBlockMetadata(rpcHttp, null as any);
  expect(metadata.previousBlockSlot).toStrictEqual(378967387);
  expect(metadata.blockHash).toStrictEqual(
    "CFPsud8DsrxUJGs5WjnB1jbqBCajYXJtuEmBfPUNXBh3",
  );
  expect(metadata.blockHeight).toStrictEqual(366940434);
  expect(metadata.blockTime?.toISOString()).toStrictEqual(
    "2025-05-06T02:42:34.000Z",
  );
  const withTransaction = await rpcHttpGetBlockWithTransactions(
    rpcHttp,
    null as any,
  );
  expect(withTransaction.previousBlockSlot).toStrictEqual(
    metadata.previousBlockSlot,
  );
  expect(withTransaction.blockHash).toStrictEqual(metadata.blockHash);
  expect(withTransaction.blockHeight).toStrictEqual(metadata.blockHeight);
  expect(withTransaction.blockTime).toStrictEqual(metadata.blockTime);
  expect(withTransaction.oldToNewTransactionsHandles.length).toStrictEqual(44);
  expect(withTransaction.oldToNewTransactionsHandles[0]).toStrictEqual(
    "2ekepJV7psmVsBsWhFRw9JeSMpqzemtR2F3kFxTQ5uHYEEFto7FsZAVnhzAwhP9sgJwDukcmLYRUT7m9DGgt6sq8",
  );
});
