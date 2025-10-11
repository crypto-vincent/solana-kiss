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
  const { accountInfo: withDataAccountInfo } = await rpcHttpGetAccountWithData(
    rpcHttp,
    accountAddress,
  );
  const { accountInfo: lamportsAccountInfo } = await rpcHttpGetAccountLamports(
    rpcHttp,
    accountAddress,
  );
  const { accountInfo: metadataAccountInfo } = await rpcHttpGetAccountMetadata(
    rpcHttp,
    accountAddress,
  );
  expect(withDataAccountInfo.lamports).toBeGreaterThan(0n);
  expect(withDataAccountInfo.owner).not.toBe(pubkeyDefault);
  expect(withDataAccountInfo.data.length).toBeGreaterThan(0);
  expect(withDataAccountInfo.lamports).toStrictEqual(
    lamportsAccountInfo.lamports,
  );
  expect(withDataAccountInfo.lamports).toStrictEqual(
    metadataAccountInfo.lamports,
  );
  expect(withDataAccountInfo.owner).toStrictEqual(metadataAccountInfo.owner);
  expect(withDataAccountInfo.executable).toStrictEqual(
    metadataAccountInfo.executable,
  );
  expect(withDataAccountInfo.data.length).toStrictEqual(
    metadataAccountInfo.space,
  );
});
