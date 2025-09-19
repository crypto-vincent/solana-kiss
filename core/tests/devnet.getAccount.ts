import { it } from "@jest/globals";
import { rpcHttpFromUrl } from "../src";
import { getAccount } from "../src/getAccount";
import { getAccountLamports } from "../src/getAccountLamports";
import { getAccountMetadata } from "../src/getAccountMetadata";

it("run", async () => {
  let rpc = rpcHttpFromUrl("https://api.devnet.solana.com");

  let dudu1 = await getAccount(
    rpc,
    "7fiDhdDH1Mp9V2teYAHdAnbpY9W5wDo8cpCV85eocynN",
  );
  console.log("dudu1", dudu1);

  let getAccountResult = await getAccount(
    rpc,
    "DL8WvebR4WVMu8WDv42zyzWuH9UZELYZ8kdhCaa83skB",
  );
  console.log("getAccountResult", getAccountResult);

  let getAccountLamportsResult = await getAccountLamports(
    rpc,
    "DL8WvebR4WVMu8WDv42zyzWuH9UZELYZ8kdhCaa83skB",
  );
  console.log("getAccountLamportsResult", getAccountLamportsResult);

  let getAccountMetadataResult = await getAccountMetadata(
    rpc,
    "DL8WvebR4WVMu8WDv42zyzWuH9UZELYZ8kdhCaa83skB",
  );
  console.log("getAccountMetadataResult", getAccountMetadataResult);
});
