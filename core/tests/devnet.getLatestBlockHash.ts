import { it } from "@jest/globals";
import { rpcHttpFromUrl } from "../src";
import { rpcHttpGetLatestBlockInfo } from "../src/rpc/RpcHttpGetLatestBlockInfo";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");

  const result1 = await rpcHttpGetLatestBlockInfo(rpcHttp);
  console.log("result1", result1);
});
