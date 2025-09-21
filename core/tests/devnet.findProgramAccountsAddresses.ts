import { it } from "@jest/globals";
import { rpcHttpFromUrl } from "../src";
import { findProgramAccountsAddresses } from "../src/rpc/findProgramAccountsAddresses";

it("run", async () => {
  const rpc = rpcHttpFromUrl("https://api.devnet.solana.com");

  const result = await findProgramAccountsAddresses(
    rpc,
    "vVeH6Xd43HAScbxjVtvfwDGqBMaMvNDLsAxwM5WK1pG",
  );
  console.log("result", result);
});
