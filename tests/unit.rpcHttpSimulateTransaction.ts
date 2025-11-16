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
  const { transactionExecution, simulatedAccountsByAddress } = expectDefined(
    await rpcHttpSimulateTransaction(
      rpcHttp,
      new Uint8Array() as TransactionPacket,
      { simulatedAccountsAddresses: new Set([dummyAddress]) },
    ),
  );
  // Check basic stuff about the transaction
  expect(transactionExecution.blockTime).toStrictEqual(undefined);
  expect(transactionExecution.blockSlot).toStrictEqual(412853857);
  expect(transactionExecution.chargedFeesLamports).toStrictEqual(10000n);
  expect(transactionExecution.consumedComputeUnits).toStrictEqual(150);
  expect(transactionExecution.logs?.length).toStrictEqual(2);
  expect(transactionExecution.logs?.[0]).toStrictEqual(
    "Program 11111111111111111111111111111111 invoke [1]",
  );
  expect(transactionExecution.error).toStrictEqual(null);
  // Check simulated accounts info
  expect(simulatedAccountsByAddress.size).toStrictEqual(1);
  const simulatedAccountInfo = expectDefined(
    simulatedAccountsByAddress.get(dummyAddress),
  );
  expect(simulatedAccountInfo.accountExecutable).toStrictEqual(false);
  expect(simulatedAccountInfo.accountLamports).toStrictEqual(1183200n);
  expect(simulatedAccountInfo.programAddress).toStrictEqual(
    "Dummy1Lt6vKTjNUWvktsufk3aUS9yDspXnzgr4TAe3y",
  );
  expect(simulatedAccountInfo.accountData).toStrictEqual(new Uint8Array(42));
});
