import { it } from "@jest/globals";
import { pubkeyDefault } from "solana-kiss-data";
import {
  rpcHttpFromUrl,
  rpcHttpGetAccountLamports,
  rpcHttpGetAccountMetadata,
  rpcHttpGetAccountWithData,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");
  const resultWithData = await rpcHttpGetAccountWithData(
    rpcHttp,
    "DL8WvebR4WVMu8WDv42zyzWuH9UZELYZ8kdhCaa83skB",
  );
  const resultLamports = await rpcHttpGetAccountLamports(
    rpcHttp,
    "DL8WvebR4WVMu8WDv42zyzWuH9UZELYZ8kdhCaa83skB",
  );
  const resultMetadata = await rpcHttpGetAccountMetadata(
    rpcHttp,
    "DL8WvebR4WVMu8WDv42zyzWuH9UZELYZ8kdhCaa83skB",
  );
  expect(resultWithData.lamports).toBeGreaterThan(0n);
  expect(resultWithData.owner).not.toBe(pubkeyDefault());
  expect(resultWithData.data.length).toBeGreaterThan(0);
  expect(resultWithData.lamports).toBe(resultLamports);
  expect(resultWithData.lamports).toBe(resultMetadata.lamports);
  expect(resultWithData.owner).toBe(resultMetadata.owner);
  expect(resultWithData.executable).toBe(resultMetadata.executable);
  expect(resultWithData.data.length).toBe(resultMetadata.space);
});
