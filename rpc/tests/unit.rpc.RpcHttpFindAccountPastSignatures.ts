import { expect, it } from "@jest/globals";
import { RpcHttp, rpcHttpFindAccountPastSignatures } from "../src";

it("run", async () => {
  const rpcHttp: RpcHttp = async () => {
    return require("./fixtures/RpcHttpGetSignaturesForAddress.json");
  };
  const signatures = await rpcHttpFindAccountPastSignatures(rpcHttp, "!", 15);
  expect(signatures.length).toStrictEqual(15);
  expect(signatures[0]).toStrictEqual(
    "ap239tUavGE8jWq9NKxTYqbwznBPxc4TTfcVWi6S5pJwnvEGjEZQrXqZ4SX44aPrAptwd1rG4f7JJwHRRwXrqNL",
  );
  expect(signatures[5]).toStrictEqual(
    "4xCgKR42j964F97d9KzFzUzucX9QMWxdrWuF3FYz5WhexjrzzXvSycxeNcz2TnUkGazWskG3rgjC5eaVfR8ncgC7",
  );
});
