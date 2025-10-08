import { expect, it } from "@jest/globals";
import { rpcHttpGetLatestBlockHash } from "../src";

it("run", async () => {
  const { blockInfo } = await rpcHttpGetLatestBlockHash(() =>
    require("./fixtures/RpcHttpGetLatestBlockHash.json"),
  );
  expect(blockInfo.hash).toStrictEqual(
    "Bq5mEjePv8j6f6675JjmapsyzyG7F83rz9EqAzV62sSe",
  );
});
