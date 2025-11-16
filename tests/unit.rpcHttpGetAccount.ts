import { expect, it } from "@jest/globals";
import {
  pubkeyNewDummy,
  rpcHttpGetAccountMetadata,
  rpcHttpGetAccountWithData,
} from "../src";

function rpcHttp() {
  return require("./fixtures/RpcHttpGetAccountInfo.json");
}

it("run", async () => {
  const withData = await rpcHttpGetAccountWithData(rpcHttp, pubkeyNewDummy());
  expect(withData.programAddress).toStrictEqual(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  );
  expect(withData.accountExecutable).toStrictEqual(true);
  expect(withData.accountLamports).toStrictEqual(42_000_000_000_000n);
  expect(withData.accountData).toStrictEqual(
    new Uint8Array([42, 42, 42, 42, 42, 42, 42, 42]),
  );
  const metadata = await rpcHttpGetAccountMetadata(rpcHttp, null as any);
  expect(metadata.programAddress).toStrictEqual(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  );
  expect(metadata.accountExecutable).toStrictEqual(true);
  expect(metadata.accountLamports).toStrictEqual(42_000_000_000_000n);
  expect(metadata.accountSpace).toStrictEqual(8);
});
