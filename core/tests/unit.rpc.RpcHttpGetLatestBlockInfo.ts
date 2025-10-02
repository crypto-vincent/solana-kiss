import { it } from "@jest/globals";
import { RpcHttp, rpcHttpGetLatestBlockInfo } from "../src";

it("run", async () => {
  const rpcHttp: RpcHttp = async () => {
    return require("./fixtures/RpcHttpGetLatestBlockhash.json");
  };
  expect(await rpcHttpGetLatestBlockInfo(rpcHttp)).toStrictEqual({
    slot: 411241512,
    hash: "Bq5mEjePv8j6f6675JjmapsyzyG7F83rz9EqAzV62sSe",
    height: 399186798,
  });
});
