import { expect, it } from "@jest/globals";
import { pubkeyNewDummy, rpcHttpFindAccountTransactions } from "../src";

function rpcHttp() {
  return require("./fixtures/RpcHttpGetSignaturesForAddress.json");
}

it("run", async () => {
  const { rewindingTransactionsHandles } = await rpcHttpFindAccountTransactions(
    rpcHttp,
    pubkeyNewDummy(),
    15,
  );
  expect(rewindingTransactionsHandles.length).toStrictEqual(15);
  expect(rewindingTransactionsHandles[0]).toStrictEqual(
    "ap239tUavGE8jWq9NKxTYqbwznBPxc4TTfcVWi6S5pJwnvEGjEZQrXqZ4SX44aPrAptwd1rG4f7JJwHRRwXrqNL",
  );
  expect(rewindingTransactionsHandles[5]).toStrictEqual(
    "4xCgKR42j964F97d9KzFzUzucX9QMWxdrWuF3FYz5WhexjrzzXvSycxeNcz2TnUkGazWskG3rgjC5eaVfR8ncgC7",
  );
});
