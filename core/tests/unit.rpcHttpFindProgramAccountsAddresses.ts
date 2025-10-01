import { it } from "@jest/globals";
import { RpcHttp, rpcHttpFindProgramAccountsAddresses } from "../src";

it("run", async () => {
  const rpcHttp: RpcHttp = async () => {
    return require("./fixtures/RpcHttpGetProgramAccounts.json");
  };
  const accountsAddresses = await rpcHttpFindProgramAccountsAddresses(
    rpcHttp,
    "!",
  );
  expect(accountsAddresses.size).toStrictEqual(100);
  expect(accountsAddresses).toContain(
    "Bj9bLzPSGPz9SFksM14t3nWJyV7ukTKtzDv2F2EU3nV3",
  );
  expect(accountsAddresses).toContain(
    "EgawuSvYdmEDPMM6HFpbgYzbMgBFMWGgbUBNNDnFtqPu",
  );
});
