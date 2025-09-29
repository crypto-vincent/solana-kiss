import { it } from "@jest/globals";
import { RpcHttp, rpcHttpFindAccountTransactionsIds } from "../src";

it("run", async () => {
  const rpcHttp: RpcHttp = async () => {
    return require("./fixtures/rpcHttp.getSignaturesForAddress.json");
  };
  const transactionsIds = await rpcHttpFindAccountTransactionsIds(
    rpcHttp,
    "!",
    15,
  );
  expect(transactionsIds.length).toStrictEqual(15);
  expect(transactionsIds[0]).toStrictEqual(
    "ap239tUavGE8jWq9NKxTYqbwznBPxc4TTfcVWi6S5pJwnvEGjEZQrXqZ4SX44aPrAptwd1rG4f7JJwHRRwXrqNL",
  );
  expect(transactionsIds[5]).toStrictEqual(
    "4xCgKR42j964F97d9KzFzUzucX9QMWxdrWuF3FYz5WhexjrzzXvSycxeNcz2TnUkGazWskG3rgjC5eaVfR8ncgC7",
  );
});
