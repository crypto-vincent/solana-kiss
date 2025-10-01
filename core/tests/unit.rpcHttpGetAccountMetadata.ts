import { it } from "@jest/globals";
import { RpcHttp, rpcHttpGetAccountMetadata } from "../src";

it("run", async () => {
  const rpcHttp: RpcHttp = async () => {
    return require("./fixtures/RpcHttpGetAccountInfo.json");
  };
  const accountInfo = await rpcHttpGetAccountMetadata(rpcHttp, "!");
  expect(accountInfo.executable).toStrictEqual(true);
  expect(accountInfo.lamports).toStrictEqual(42_000_000_000_000n);
  expect(accountInfo.owner).toStrictEqual(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  );
  expect(accountInfo.space).toStrictEqual(8);
});
