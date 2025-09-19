import { it } from "@jest/globals";
import { rpcHttpFromUrl } from "../src";
import { findProgramAccountsAddresses } from "../src/findProgramAccountsAddresses";

it("run", async () => {
  let rpc = rpcHttpFromUrl("https://api.devnet.solana.com");

  let result = await findProgramAccountsAddresses(
    rpc,
    "vVeH6Xd43HAScbxjVtvfwDGqBMaMvNDLsAxwM5WK1pG",
  );
  console.log("result", result);
});
