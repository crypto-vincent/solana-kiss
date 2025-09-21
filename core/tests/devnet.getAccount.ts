import { it } from "@jest/globals";
import { rpcHttpFromUrl } from "../src";
import { getAccount } from "../src/rpc/getAccount";
import { getAccountLamports } from "../src/rpc/getAccountLamports";
import { getAccountMetadata } from "../src/rpc/getAccountMetadata";

it("run", async () => {
  const rpc = rpcHttpFromUrl("https://api.devnet.solana.com");

  const dudu1 = await getAccount(
    rpc,
    "7fiDhdDH1Mp9V2teYAHdAnbpY9W5wDo8cpCV85eocynN",
  );
  console.log("dudu1", dudu1);

  const getAccountResult = await getAccount(
    rpc,
    "DL8WvebR4WVMu8WDv42zyzWuH9UZELYZ8kdhCaa83skB",
  );
  console.log("getAccountResult", getAccountResult);

  const getAccountLamportsResult = await getAccountLamports(
    rpc,
    "DL8WvebR4WVMu8WDv42zyzWuH9UZELYZ8kdhCaa83skB",
  );
  console.log("getAccountLamportsResult", getAccountLamportsResult);

  const getAccountMetadataResult = await getAccountMetadata(
    rpc,
    "DL8WvebR4WVMu8WDv42zyzWuH9UZELYZ8kdhCaa83skB",
  );
  console.log("getAccountMetadataResult", getAccountMetadataResult);
});
