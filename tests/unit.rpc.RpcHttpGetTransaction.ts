import { expect, it } from "@jest/globals";
import { rpcHttpGetTransaction, Signature } from "../src";

it("run", async () => {
  const { transactionExecution, transactionCallStack } =
    (await rpcHttpGetTransaction(
      () => require("./fixtures/RpcHttpGetTransaction.json"),
      "!" as Signature,
    ))!;
  // Check basic stuff about the transaction
  expect(transactionExecution.blockInfo.time?.toISOString()).toStrictEqual(
    "2025-03-24T14:28:45.000Z",
  );
  expect(transactionExecution.blockInfo.slot).toStrictEqual(328883613);
  expect(transactionExecution.chargedFeesLamports).toStrictEqual(32510n);
  expect(transactionExecution.consumedComputeUnits).toStrictEqual(42381);
  expect(transactionExecution.logs?.length).toStrictEqual(22);
  expect(transactionExecution.logs?.[0]).toStrictEqual(
    "Program ComputeBudget111111111111111111111111111111 invoke [1]",
  );
  expect(transactionExecution.error).toStrictEqual(null);
  // Check the message content
  expect(transactionExecution.message.payerAddress).toStrictEqual(
    "Hc3EobqKYuqndAYmPzEhokBab3trofMWDafj4PJxFYUL",
  );
  expect(transactionExecution.message.instructions.length).toStrictEqual(4);
  expect(
    transactionExecution.message.instructions[0]!.programAddress,
  ).toStrictEqual("ComputeBudget111111111111111111111111111111");
  expect(transactionExecution.message.instructions[0]!.data).toStrictEqual(
    new Uint8Array([2, 32, 161, 7, 0]),
  );
  expect(transactionExecution.message.recentBlockHash).toStrictEqual(
    "4nTobZxuiA9xZDuSMfSQE6WJSswAkoVoF7ycve42iiy2",
  );
  // Check the invocations content
  console.log(
    "Transaction call stack",
    JSON.stringify(transactionCallStack, null, 2),
  );
  /*
  expect(transactionInvocations.length).toStrictEqual(4);
  expect(transactionInvocations[0]!.instruction).toStrictEqual(
    transactionExecution.message.instructions[0]!,
  );
  expect(transactionInvocations[0]!.invocations.length).toStrictEqual(0);
  // Check the nested invocations content
  expect(transactionInvocations[3]!.invocations.length).toStrictEqual(2);
  expect(
    transactionInvocations[3]!.invocations[0]!.instruction.programAddress,
  ).toStrictEqual("PsyMP8fXEEMo2C6C84s8eXuRUrvzQnZyquyjipDRohf");
  expect(
    transactionInvocations[3]!.invocations[0]!.invocations.length,
  ).toStrictEqual(1);
  expect(
    transactionInvocations[3]!.invocations[0]!.invocations[0]!.invocations
      .length,
  ).toStrictEqual(1);
  expect(
    transactionInvocations[3]!.invocations[1]!.invocations.length,
  ).toStrictEqual(0);
  */
});
