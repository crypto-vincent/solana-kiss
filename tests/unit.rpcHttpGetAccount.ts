import { expect, it } from "@jest/globals";
import {
  pubkeyNewDummy,
  rpcHttpGetAccountMetadata,
  rpcHttpGetAccountWithData,
} from "../src";

it("run", async () => {
  const { accountInfo: withDataAccountInfo } = await rpcHttpGetAccountWithData(
    () => require("./fixtures/RpcHttpGetAccountInfo.json"),
    pubkeyNewDummy(),
  );
  expect(withDataAccountInfo.executable).toStrictEqual(true);
  expect(withDataAccountInfo.lamports).toStrictEqual(42_000_000_000_000n);
  expect(withDataAccountInfo.owner).toStrictEqual(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  );
  expect(withDataAccountInfo.data).toStrictEqual(
    new Uint8Array([42, 42, 42, 42, 42, 42, 42, 42]),
  );
  const { accountInfo: metadataAccountInfo } = await rpcHttpGetAccountMetadata(
    () => require("./fixtures/RpcHttpGetAccountInfo.json"),
    null as any,
  );
  expect(metadataAccountInfo.executable).toStrictEqual(true);
  expect(metadataAccountInfo.lamports).toStrictEqual(42_000_000_000_000n);
  expect(metadataAccountInfo.owner).toStrictEqual(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  );
  expect(metadataAccountInfo.space).toStrictEqual(8);
});
