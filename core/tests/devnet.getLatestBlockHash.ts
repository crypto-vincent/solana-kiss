import { it } from "@jest/globals";
import { rpcHttpFromUrl, rpcHttpGetLatestBlockHash } from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");

  const result1 = await rpcHttpGetLatestBlockHash(rpcHttp);
  console.log("result1", result1);
});
