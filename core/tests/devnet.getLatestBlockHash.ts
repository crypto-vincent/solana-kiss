import { it } from "@jest/globals";
import { getLatestBlockHash, rpcHttpFromUrl } from "../src";

it("run", async () => {
  const rpc = rpcHttpFromUrl("https://api.devnet.solana.com");

  const result1 = await getLatestBlockHash(rpc);
  console.log("result1", result1);
});
