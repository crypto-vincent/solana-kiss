import { expect, it } from "@jest/globals";
import { RpcHttp, rpcHttpGetTransaction } from "../src";

it("run", async () => {
  const rpcHttp: RpcHttp = async () => {
    return require("./fixtures/RpcHttpGetTransaction.json");
  };
  const transaction = (await rpcHttpGetTransaction(rpcHttp, "!"))!;
  // Check basic stuff about the transaction
  expect(transaction.slot).toStrictEqual(328883613);
  expect(transaction.error).toStrictEqual(null);
  expect(transaction.logs.length).toStrictEqual(18);
  expect(transaction.logs[0]).toStrictEqual(
    "Program ComputeBudget111111111111111111111111111111 invoke [1]",
  );
  expect(transaction.chargedFees).toStrictEqual(32510n);
  expect(transaction.consumedComputeUnits).toStrictEqual(42381);
  // Check the message content
  expect(transaction.message.payerAddress).toStrictEqual(
    "Hc3EobqKYuqndAYmPzEhokBab3trofMWDafj4PJxFYUL",
  );
  expect(transaction.message.instructions.length).toStrictEqual(4);
  expect(transaction.message.instructions[0]!.programAddress).toStrictEqual(
    "ComputeBudget111111111111111111111111111111",
  );
  expect(transaction.message.instructions[0]!.data).toStrictEqual(
    new Uint8Array([2, 32, 161, 7, 0]),
  );
  expect(transaction.message.recentBlockHash).toStrictEqual(
    "4nTobZxuiA9xZDuSMfSQE6WJSswAkoVoF7ycve42iiy2",
  );
  // Check the invocations content
  expect(transaction.invocations.length).toStrictEqual(4);
  expect(transaction.invocations[0]!.instruction).toStrictEqual(
    transaction.message.instructions[0]!,
  );
  expect(transaction.invocations[0]!.invocations.length).toStrictEqual(0);
  // Check the nested invocations content
  expect(transaction.invocations[3]!.invocations.length).toStrictEqual(2);
  expect(
    transaction.invocations[3]!.invocations[0]!.instruction.programAddress,
  ).toStrictEqual("PsyMP8fXEEMo2C6C84s8eXuRUrvzQnZyquyjipDRohf");
  expect(
    transaction.invocations[3]!.invocations[0]!.invocations.length,
  ).toStrictEqual(1);
  expect(
    transaction.invocations[3]!.invocations[0]!.invocations[0]!.invocations
      .length,
  ).toStrictEqual(1);
  expect(
    transaction.invocations[3]!.invocations[1]!.invocations.length,
  ).toStrictEqual(0);
});
