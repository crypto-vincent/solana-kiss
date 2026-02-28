import { expect, it } from "@jest/globals";
import {
  expectDefined,
  pubkeyNewDummy,
  rpcHttpSimulateTransaction,
  TransactionPacket,
} from "../src";

function rpcHttp() {
  return require("./fixtures/RpcHttpSimulateTransaction.json");
}

it("run", async () => {
  const dummyAddress = pubkeyNewDummy();
  const { executionReport, simulatedAccountsByAddress } = expectDefined(
    await rpcHttpSimulateTransaction(
      rpcHttp,
      new Uint8Array() as TransactionPacket,
      { simulatedAccountsAddresses: new Set([dummyAddress]) },
    ),
  );
  // Check basic stuff about the transaction
  expect(executionReport.blockTime).toStrictEqual(undefined);
  expect(executionReport.blockSlot).toStrictEqual(412853857);
  expect(executionReport.chargedFeesLamports).toStrictEqual(10000n);
  expect(executionReport.consumedComputeUnits).toStrictEqual(150);
  expect(executionReport.transactionLogs?.length).toStrictEqual(2);
  expect(executionReport.transactionLogs?.[0]).toStrictEqual(
    "Program 11111111111111111111111111111111 invoke [1]",
  );
  expect(executionReport.transactionError).toStrictEqual(null);
  // Check simulated accounts info
  expect(simulatedAccountsByAddress.size).toStrictEqual(1);
  const simulatedAccount = expectDefined(
    simulatedAccountsByAddress.get(dummyAddress),
  );
  expect(simulatedAccount.accountExecutable).toStrictEqual(false);
  expect(simulatedAccount.accountLamports).toStrictEqual(1183200n);
  expect(simulatedAccount.programAddress).toStrictEqual(
    "Dummy1Lt6vKTjNUWvktsufk3aUS9yDspXnzgr4TAe3y",
  );
  expect(simulatedAccount.accountData).toStrictEqual(new Uint8Array(42));
});
