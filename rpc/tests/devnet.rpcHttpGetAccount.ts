import { expect, it } from "@jest/globals";
import { pubkeyDefault, pubkeyFromString } from "solana-kiss-data";
import {
  rpcHttpFromUrl,
  rpcHttpGetAccountLamports,
  rpcHttpGetAccountMetadata,
  rpcHttpGetAccountWithData,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");
  const accountAddress = pubkeyFromString(
    "DL8WvebR4WVMu8WDv42zyzWuH9UZELYZ8kdhCaa83skB",
  );
  const resultWithData = await rpcHttpGetAccountWithData(
    rpcHttp,
    accountAddress,
  );
  const resultLamports = await rpcHttpGetAccountLamports(
    rpcHttp,
    accountAddress,
  );
  const resultMetadata = await rpcHttpGetAccountMetadata(
    rpcHttp,
    accountAddress,
  );
  expect(resultWithData.lamports).toBeGreaterThan(0n);
  expect(resultWithData.owner).not.toBe(pubkeyDefault);
  expect(resultWithData.data.length).toBeGreaterThan(0);
  expect(resultWithData.lamports).toBe(resultLamports);
  expect(resultWithData.lamports).toBe(resultMetadata.lamports);
  expect(resultWithData.owner).toBe(resultMetadata.owner);
  expect(resultWithData.executable).toBe(resultMetadata.executable);
  expect(resultWithData.data.length).toBe(resultMetadata.space);
});
