import { it } from "@jest/globals";
import { rpcHttpFromUrl } from "../src";
import { rpcHttpGetAccount } from "../src/rpc/rpcHttpGetAccount";
import { rpcHttpGetAccountLamports } from "../src/rpc/rpcHttpGetAccountLamports";
import { rpcHttpGetAccountMetadata } from "../src/rpc/rpcHttpGetAccountMetadata";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");

  const dudu1 = await rpcHttpGetAccount(
    rpcHttp,
    "7fiDhdDH1Mp9V2teYAHdAnbpY9W5wDo8cpCV85eocynN",
  );
  console.log("dudu1", dudu1);

  const getAccountResult = await rpcHttpGetAccount(
    rpcHttp,
    "DL8WvebR4WVMu8WDv42zyzWuH9UZELYZ8kdhCaa83skB",
  );
  console.log("getAccountResult", getAccountResult);

  const getAccountLamportsResult = await rpcHttpGetAccountLamports(
    rpcHttp,
    "DL8WvebR4WVMu8WDv42zyzWuH9UZELYZ8kdhCaa83skB",
  );
  console.log("getAccountLamportsResult", getAccountLamportsResult);

  const getAccountMetadataResult = await rpcHttpGetAccountMetadata(
    rpcHttp,
    "DL8WvebR4WVMu8WDv42zyzWuH9UZELYZ8kdhCaa83skB",
  );
  console.log("getAccountMetadataResult", getAccountMetadataResult);
});
