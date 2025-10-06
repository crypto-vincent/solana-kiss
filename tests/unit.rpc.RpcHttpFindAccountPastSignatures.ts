import { expect, it } from "@jest/globals";
import { pubkeyNewDummy, rpcHttpFindAccountPastSignatures } from "../src";

it("run", async () => {
  const signatures = await rpcHttpFindAccountPastSignatures(
    () => require("./fixtures/RpcHttpGetSignaturesForAddress.json"),
    pubkeyNewDummy(),
    15,
  );
  expect(signatures.length).toStrictEqual(15);
  expect(signatures[0]).toStrictEqual(
    "ap239tUavGE8jWq9NKxTYqbwznBPxc4TTfcVWi6S5pJwnvEGjEZQrXqZ4SX44aPrAptwd1rG4f7JJwHRRwXrqNL",
  );
  expect(signatures[5]).toStrictEqual(
    "4xCgKR42j964F97d9KzFzUzucX9QMWxdrWuF3FYz5WhexjrzzXvSycxeNcz2TnUkGazWskG3rgjC5eaVfR8ncgC7",
  );
});
