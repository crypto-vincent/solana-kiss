import { expect, it } from "@jest/globals";
import {
  pubkeyNewDummy,
  rpcHttpGetAccountMetadata,
  rpcHttpGetAccountWithData,
} from "../src";

it("run", async () => {
  const { accountInfo: withDataInfo } = await rpcHttpGetAccountWithData(
    () => require("./fixtures/RpcHttpGetAccountInfo.json"),
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
    () => require("./fixtures/RpcHttpGetAccountInfo.json"),
    null as any,
  );
  expect(metadataInfo.executable).toStrictEqual(true);
  expect(metadataInfo.lamports).toStrictEqual(42_000_000_000_000n);
  expect(metadataInfo.owner).toStrictEqual(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  );
  expect(metadataInfo.space).toStrictEqual(8);
});
