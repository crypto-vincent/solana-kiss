import { it } from "@jest/globals";
import { getLatestBlockHash, rpcHttpFromUrl } from "../src";

it("run", async () => {
  let rpc = rpcHttpFromUrl("https://api.devnet.solana.com");

  let result1 = await getLatestBlockHash(rpc);
  console.log("result1", result1);
});
