import { it } from "@jest/globals";
import { rpcHttpGetBlockMetadata, rpcHttpGetBlockTransactions } from "../src";

it("run", async () => {
  const { blockInfo, parentBlockSlot } = await rpcHttpGetBlockMetadata(
    () => require("./fixtures/RpcHttpGetBlock.json"),
    null as any,
  );
  expect(parentBlockSlot).toStrictEqual(378967387);
  expect(blockInfo.hash).toStrictEqual(
    "CFPsud8DsrxUJGs5WjnB1jbqBCajYXJtuEmBfPUNXBh3",
  );
  expect(blockInfo.height).toStrictEqual(366940434);
  expect(blockInfo.time?.toISOString()).toStrictEqual(
    "2025-05-06T02:42:34.000Z",
  );
  const { transactionsIds } = await rpcHttpGetBlockTransactions(
    () => require("./fixtures/RpcHttpGetBlock.json"),
    null as any,
  );
  expect(transactionsIds.length).toStrictEqual(44);
  expect(transactionsIds[0]).toStrictEqual(
    "2ekepJV7psmVsBsWhFRw9JeSMpqzemtR2F3kFxTQ5uHYEEFto7FsZAVnhzAwhP9sgJwDukcmLYRUT7m9DGgt6sq8",
  );
});
