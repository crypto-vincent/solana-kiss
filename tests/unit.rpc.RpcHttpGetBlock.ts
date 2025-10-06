import { it } from "@jest/globals";
import { rpcHttpGetBlock } from "../src/rpc/RpcHttpGetBlock";

it("run", async () => {
  const block = await rpcHttpGetBlock(
    () => require("./fixtures/RpcHttpGetBlock.json"),
    null as any,
  );
  expect(block.hash).toStrictEqual(
    "CFPsud8DsrxUJGs5WjnB1jbqBCajYXJtuEmBfPUNXBh3",
  );
  expect(block.height).toStrictEqual(366940434);
  expect(block.time?.toISOString()).toStrictEqual("2025-05-06T02:42:34.000Z");
  expect(block.signatures.length).toStrictEqual(44);
  expect(block.signatures[0]).toStrictEqual(
    "2ekepJV7psmVsBsWhFRw9JeSMpqzemtR2F3kFxTQ5uHYEEFto7FsZAVnhzAwhP9sgJwDukcmLYRUT7m9DGgt6sq8",
  );
});
