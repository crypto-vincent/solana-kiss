import { it } from "@jest/globals";
import { RpcHttp, rpcHttpFindAccountTransactionsKeys } from "../src";

it("run", async () => {
  const rpcHttp: RpcHttp = async () => {
    return require("./fixtures/RpcHttpGetSignaturesForAddress.json");
  };
  const transactionsKeys = await rpcHttpFindAccountTransactionsKeys(
    rpcHttp,
    "!",
    15,
  );
  expect(transactionsKeys.length).toStrictEqual(15);
  expect(transactionsKeys[0]).toStrictEqual(
    "ap239tUavGE8jWq9NKxTYqbwznBPxc4TTfcVWi6S5pJwnvEGjEZQrXqZ4SX44aPrAptwd1rG4f7JJwHRRwXrqNL",
  );
  expect(transactionsKeys[5]).toStrictEqual(
    "4xCgKR42j964F97d9KzFzUzucX9QMWxdrWuF3FYz5WhexjrzzXvSycxeNcz2TnUkGazWskG3rgjC5eaVfR8ncgC7",
  );
});
