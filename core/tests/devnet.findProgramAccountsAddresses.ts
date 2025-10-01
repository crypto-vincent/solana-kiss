import { it } from "@jest/globals";
import { rpcHttpFromUrl } from "../src";
import { rpcHttpFindProgramAccountsAddresses } from "../src/rpc/RpcHttpFindProgramAccountsAddresses";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");

  const result = await rpcHttpFindProgramAccountsAddresses(
    rpcHttp,
    "vVeH6Xd43HAScbxjVtvfwDGqBMaMvNDLsAxwM5WK1pG",
  );
  console.log("result", result);
});
