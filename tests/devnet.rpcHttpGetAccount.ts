import { expect, it } from "@jest/globals";
import {
  pubkeyDefault,
  pubkeyFromBase58,
  rpcHttpFromUrl,
  rpcHttpGetAccountLamports,
  rpcHttpGetAccountMetadata,
  rpcHttpGetAccountWithData,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");
  const accountAddress = pubkeyFromBase58(
    "DL8WvebR4WVMu8WDv42zyzWuH9UZELYZ8kdhCaa83skB",
  );
  const { accountInfo: withDataInfo } = await rpcHttpGetAccountWithData(
    rpcHttp,
    accountAddress,
  );
  const { accountInfo: lamportsInfo } = await rpcHttpGetAccountLamports(
    rpcHttp,
    accountAddress,
  );
  const { accountInfo: metadataInfo } = await rpcHttpGetAccountMetadata(
    rpcHttp,
    accountAddress,
  );
  expect(withDataInfo.lamports).toBeGreaterThan(0n);
  expect(withDataInfo.owner).not.toBe(pubkeyDefault);
  expect(withDataInfo.data.length).toBeGreaterThan(0);
  expect(withDataInfo.lamports).toStrictEqual(lamportsInfo.lamports);
  expect(withDataInfo.lamports).toStrictEqual(metadataInfo.lamports);
  expect(withDataInfo.owner).toStrictEqual(metadataInfo.owner);
  expect(withDataInfo.executable).toStrictEqual(metadataInfo.executable);
  expect(withDataInfo.data.length).toStrictEqual(metadataInfo.space);
});
