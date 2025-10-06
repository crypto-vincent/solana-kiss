import { expect, it } from "@jest/globals";
import { rpcHttpGetAccountMetadata } from "../src";

it("run", async () => {
  const accountInfo = await rpcHttpGetAccountMetadata(
    () => require("./fixtures/RpcHttpGetAccountInfo.json"),
    null as any,
  );
  expect(accountInfo.executable).toStrictEqual(true);
  expect(accountInfo.lamports).toStrictEqual(42_000_000_000_000n);
  expect(accountInfo.owner).toStrictEqual(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  );
  expect(accountInfo.space).toStrictEqual(8);
});
