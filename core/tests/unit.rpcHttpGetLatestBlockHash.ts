import { it } from "@jest/globals";
import { RpcHttp, rpcHttpGetLatestBlockInfo } from "../src";

it("run", async () => {
  const rpcHttp: RpcHttp = async () => {
    return require("./fixtures/rpcHttp.getRecentBlockHash.json");
  };
  const latestBlockHash = await rpcHttpGetLatestBlockInfo(rpcHttp);
  expect(latestBlockHash).toStrictEqual(
    "Bq5mEjePv8j6f6675JjmapsyzyG7F83rz9EqAzV62sSe",
  );
});
