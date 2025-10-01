import { it } from "@jest/globals";
import { rpcHttpFromUrl } from "../src";
import { rpcHttpGetAccountLamports } from "../src/rpc/RpcHttpGetAccountLamports";
import { rpcHttpGetAccountMetadata } from "../src/rpc/RpcHttpGetAccountMetadata";
import { rpcHttpGetAccountWithData } from "../src/rpc/RpcHttpGetAccountWithData";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");

  const dudu1 = await rpcHttpGetAccountWithData(
    rpcHttp,
    "7fiDhdDH1Mp9V2teYAHdAnbpY9W5wDo8cpCV85eocynN",
  );
  console.log("dudu1", dudu1);

  const getAccountResult = await rpcHttpGetAccountWithData(
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
