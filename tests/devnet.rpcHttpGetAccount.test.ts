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
  const onlyLamports = await rpcHttpGetAccountLamports(rpcHttp, accountAddress);
  const onlyMetadata = await rpcHttpGetAccountMetadata(rpcHttp, accountAddress);
  expect(withData.programAddress).not.toBe(pubkeyDefault);
  expect(withData.accountLamports).toBeGreaterThan(0n);
  expect(withData.accountData.length).toBeGreaterThan(0);
  expect(withData.accountLamports).toStrictEqual(onlyLamports.accountLamports);
  expect(withData.programAddress).toStrictEqual(onlyMetadata.programAddress);
  expect(withData.accountExecutable).toStrictEqual(
    onlyMetadata.accountExecutable,
  );
  expect(withData.accountLamports).toStrictEqual(onlyMetadata.accountLamports);
  expect(withData.accountData.length).toStrictEqual(onlyMetadata.accountSpace);
});
