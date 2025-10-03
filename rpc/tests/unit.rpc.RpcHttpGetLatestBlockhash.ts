import { expect, it } from "@jest/globals";
import { RpcHttp, rpcHttpGetLatestBlockhash } from "../src";

it("run", async () => {
  const rpcHttp: RpcHttp = async () => {
    return require("./fixtures/RpcHttpGetLatestBlockhash.json");
  };
  expect(await rpcHttpGetLatestBlockhash(rpcHttp)).toStrictEqual(
    "Bq5mEjePv8j6f6675JjmapsyzyG7F83rz9EqAzV62sSe",
  );
});
