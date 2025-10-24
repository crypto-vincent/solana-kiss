import { expect, it } from "@jest/globals";
import { pubkeyNewDummy, rpcHttpFindProgramOwnedAccounts } from "../src";

it("run", async () => {
  const accountsOwnedResponse = await rpcHttpFindProgramOwnedAccounts(
    () => require("./fixtures/RpcHttpGetProgramAccounts.json"),
    pubkeyNewDummy(),
  );
  const accountsOwnedAddresses = accountsOwnedResponse.accountsAddresses;
  expect(accountsOwnedAddresses.size).toStrictEqual(100);
  expect(accountsOwnedAddresses).toContain(
    "Bj9bLzPSGPz9SFksM14t3nWJyV7ukTKtzDv2F2EU3nV3",
  );
  expect(accountsOwnedAddresses).toContain(
    "EgawuSvYdmEDPMM6HFpbgYzbMgBFMWGgbUBNNDnFtqPu",
  );
});
