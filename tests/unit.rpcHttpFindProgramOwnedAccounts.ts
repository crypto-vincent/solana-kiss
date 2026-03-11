import { expect, it } from "@jest/globals";
import { pubkeyNewDummy, rpcHttpFindProgramOwnedAccounts } from "../src";

function rpcHttp(method: string) {
  if (method === "getProgramAccounts") {
    return require("./fixtures/solana.getProgramAccounts.json");
  }
  throw new Error(`Unexpected method ${method}`);
}

it("run", async () => {
  const ownedAccounts = await rpcHttpFindProgramOwnedAccounts(
    rpcHttp,
    pubkeyNewDummy(),
  );
  expect(ownedAccounts).toStrictEqual([
    {
      accountAddress: "GiFS9qwe8qtA3rxTDZ6tdK5CKbUz4QhTCvd5rBRbFy6U",
      accountExecutable: false,
      accountLamports: 1113600n,
      accountSpace: 1,
    },
    {
      accountAddress: "DRC1cPt9bR91pmhARVVoMCXW5wSqXMummxdRyDzy5zHE",
      accountExecutable: true,
      accountLamports: 999999999n,
      accountSpace: 99,
    },
    {
      accountAddress: "8uTb3omT5W4gQpaNvGJfzr7FP1GyjebumN4UshBBEcoo",
      accountExecutable: false,
      accountLamports: 1113600n,
      accountSpace: 32,
    },
  ]);
});
