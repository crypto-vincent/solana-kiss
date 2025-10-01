import { it } from "@jest/globals";
import { RpcHttp, rpcHttpGetAccountWithData } from "../src";

it("run", async () => {
  const rpcHttp: RpcHttp = async () => {
    return require("./fixtures/RpcHttpGetAccountInfo.json");
  };
  const accountInfo = await rpcHttpGetAccountWithData(rpcHttp, "!");
  expect(accountInfo.executable).toStrictEqual(true);
  expect(accountInfo.lamports).toStrictEqual(42_000_000_000_000n);
  expect(accountInfo.owner).toStrictEqual(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  );
  expect(accountInfo.data).toStrictEqual(
    new Uint8Array([42, 42, 42, 42, 42, 42, 42, 42]),
  );
});
