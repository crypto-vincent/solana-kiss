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
  const { accountInfo: withDataInfo } = await rpcHttpGetAccountWithData(
    rpcHttp,
    pubkeyNewDummy(),
  );
  expect(withDataInfo.executable).toStrictEqual(true);
  expect(withDataInfo.lamports).toStrictEqual(42_000_000_000_000n);
  expect(withDataInfo.owner).toStrictEqual(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  );
  expect(withDataInfo.data).toStrictEqual(
    new Uint8Array([42, 42, 42, 42, 42, 42, 42, 42]),
  );
  const { accountInfo: metadataInfo } = await rpcHttpGetAccountMetadata(
    rpcHttp,
    null as any,
  );
  expect(metadataInfo.executable).toStrictEqual(true);
  expect(metadataInfo.lamports).toStrictEqual(42_000_000_000_000n);
  expect(metadataInfo.owner).toStrictEqual(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  );
  expect(metadataInfo.space).toStrictEqual(8);
});
