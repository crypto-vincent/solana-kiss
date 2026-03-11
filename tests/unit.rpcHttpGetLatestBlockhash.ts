import { expect, it } from "@jest/globals";
import { rpcHttpGetLatestBlockHash } from "../src";

function rpcHttp(method: string) {
  if (method === "getLatestBlockhash") {
    return require("./fixtures/solana.getLatestBlockhash.json");
  }
  throw new Error(`Unexpected method ${method}`);
}

it("run", async () => {
  const { blockHash } = await rpcHttpGetLatestBlockHash(rpcHttp);
  expect(blockHash).toStrictEqual(
    "Bq5mEjePv8j6f6675JjmapsyzyG7F83rz9EqAzV62sSe",
  );
});
