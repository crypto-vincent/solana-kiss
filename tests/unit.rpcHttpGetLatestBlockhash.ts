import { expect, it } from "@jest/globals";
import { rpcHttpGetLatestBlockHash } from "../src";

function rpcHttp() {
  return require("./fixtures/RpcHttpGetLatestBlockhash.json");
}

it("run", async () => {
  const { blockHash } = await rpcHttpGetLatestBlockHash(rpcHttp);
  expect(blockHash).toStrictEqual(
    "Bq5mEjePv8j6f6675JjmapsyzyG7F83rz9EqAzV62sSe",
  );
});
