import { expect, it } from "@jest/globals";
import { rpcHttpGetLatestBlockHash } from "../src";

function rpcHttp() {
  return require("./fixtures/RpcHttpGetLatestBlockHash.json");
}

it("run", async () => {
  const { blockInfo } = await rpcHttpGetLatestBlockHash(rpcHttp);
  expect(blockInfo.hash).toStrictEqual(
    "Bq5mEjePv8j6f6675JjmapsyzyG7F83rz9EqAzV62sSe",
  );
});
