import { expect, it } from "@jest/globals";
import { pubkeyNewDummy, rpcHttpFindProgramOwnedAddresses } from "../src";

it("run", async () => {
  const accountsAddresses = await rpcHttpFindProgramOwnedAddresses(
    () => require("./fixtures/RpcHttpGetProgramAccounts.json"),
    pubkeyNewDummy(),
  );
  expect(accountsAddresses.size).toStrictEqual(100);
  expect(accountsAddresses).toContain(
    "Bj9bLzPSGPz9SFksM14t3nWJyV7ukTKtzDv2F2EU3nV3",
  );
  expect(accountsAddresses).toContain(
    "EgawuSvYdmEDPMM6HFpbgYzbMgBFMWGgbUBNNDnFtqPu",
  );
});
