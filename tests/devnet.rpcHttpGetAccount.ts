import { expect, it } from "@jest/globals";
import {
  pubkeyDefault,
  pubkeyFromBase58,
  rpcHttpFromUrl,
  rpcHttpGetAccountLamports,
  rpcHttpGetAccountMetadata,
  rpcHttpGetAccountWithData,
  urlRpcPublicDevnet,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl(urlRpcPublicDevnet);
  const accountAddress = pubkeyFromBase58(
    "DL8WvebR4WVMu8WDv42zyzWuH9UZELYZ8kdhCaa83skB",
  );
  const withData = await rpcHttpGetAccountWithData(rpcHttp, accountAddress);
  const lamports = await rpcHttpGetAccountLamports(rpcHttp, accountAddress);
  const metadata = await rpcHttpGetAccountMetadata(rpcHttp, accountAddress);
  expect(withData.programAddress).not.toBe(pubkeyDefault);
  expect(withData.accountLamports).toBeGreaterThan(0n);
  expect(withData.accountData.length).toBeGreaterThan(0);
  expect(withData.accountLamports).toStrictEqual(lamports.accountLamports);
  expect(withData.programAddress).toStrictEqual(metadata.programAddress);
  expect(withData.accountExecutable).toStrictEqual(metadata.accountExecutable);
  expect(withData.accountLamports).toStrictEqual(metadata.accountLamports);
  expect(withData.accountData.length).toStrictEqual(metadata.accountSpace);
});
