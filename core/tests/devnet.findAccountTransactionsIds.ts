import { it } from "@jest/globals";
import { rpcHttpFromUrl } from "../src";
import { findAccountTransactionsIds } from "../src/findAccountTransactionsIds";

it("run", async () => {
  let rpc = rpcHttpFromUrl("https://api.devnet.solana.com");

  let result = await findAccountTransactionsIds(
    rpc,
    "vVeH6Xd43HAScbxjVtvfwDGqBMaMvNDLsAxwM5WK1pG",
    4200,
  );
  console.log("result", result);
});
