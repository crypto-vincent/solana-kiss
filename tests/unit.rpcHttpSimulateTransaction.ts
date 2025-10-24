import { expect, it } from "@jest/globals";
import {
  expectDefined,
  pubkeyNewDummy,
  rpcHttpSimulateTransaction,
  TransactionPacket,
} from "../src";

it("run", async () => {
  const dummyAddress = pubkeyNewDummy();
  const { transactionExecution, simulatedAccountInfoByAddress } = expectDefined(
    await rpcHttpSimulateTransaction(
      () => require("./fixtures/RpcHttpSimulateTransaction.json"),
      new Uint8Array() as TransactionPacket,
      { simulatedAccountsAddresses: new Set([dummyAddress]) },
    ),
  );
  // Check basic stuff about the transaction
  expect(transactionExecution.blockInfo.time).toStrictEqual(undefined);
  expect(transactionExecution.blockInfo.slot).toStrictEqual(412853857);
  expect(transactionExecution.chargedFeesLamports).toStrictEqual(10000n);
  expect(transactionExecution.consumedComputeUnits).toStrictEqual(150);
  expect(transactionExecution.logs?.length).toStrictEqual(2);
  expect(transactionExecution.logs?.[0]).toStrictEqual(
    "Program 11111111111111111111111111111111 invoke [1]",
  );
  expect(transactionExecution.error).toStrictEqual(null);
  // Check simulated accounts info
  expect(simulatedAccountInfoByAddress.size).toStrictEqual(1);
  const simulatedAccountInfo = expectDefined(
    simulatedAccountInfoByAddress.get(dummyAddress),
  );
  expect(simulatedAccountInfo.executable).toStrictEqual(false);
  expect(simulatedAccountInfo.lamports).toStrictEqual(1183200n);
  expect(simulatedAccountInfo.owner).toStrictEqual(
    "Dummy1Lt6vKTjNUWvktsufk3aUS9yDspXnzgr4TAe3y",
  );
  expect(simulatedAccountInfo.data).toStrictEqual(new Uint8Array(42));
});
