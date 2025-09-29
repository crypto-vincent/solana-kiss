import { it } from "@jest/globals";
import { RpcHttp, rpcHttpGetLatestBlockHash } from "../src";

it("run", async () => {
  const rpcHttp: RpcHttp = async () => {
    return require("./fixtures/rpcHttp.getLatestBlockHash.json");
  };
  const latestBlockHash = await rpcHttpGetLatestBlockHash(rpcHttp);
  expect(latestBlockHash).toStrictEqual(
    "Bq5mEjePv8j6f6675JjmapsyzyG7F83rz9EqAzV62sSe",
  );
});
