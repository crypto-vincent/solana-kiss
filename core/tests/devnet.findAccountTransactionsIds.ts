import { it } from "@jest/globals";
import { rpcHttpFromUrl } from "../src";
import { rpcHttpFindAccountTransactionsKeys } from "../src/rpc/rpcHttpFindAccountTransactionsKeys";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");

  const result = await rpcHttpFindAccountTransactionsKeys(
    rpcHttp,
    "vVeH6Xd43HAScbxjVtvfwDGqBMaMvNDLsAxwM5WK1pG",
    4200,
  );
  console.log("result", result);
});
