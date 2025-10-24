import { expect, it } from "@jest/globals";
import {
  expectDefined,
  Instruction,
  InstructionInput,
  pubkeyFromBase58,
  rpcHttpGetTransaction,
  TransactionFlow,
  TransactionId,
} from "../src";

it("run", async () => {
  const { transactionRequest, transactionExecution, transactionFlow } =
    expectDefined(
      await rpcHttpGetTransaction(
        () => require("./fixtures/RpcHttpGetTransaction.json"),
        "!" as TransactionId,
      ),
    );
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
  expect(transactionRequest.payerAddress).toStrictEqual(
    "Hc3EobqKYuqndAYmPzEhokBab3trofMWDafj4PJxFYUL",
  );
  expect(transactionRequest.instructions.length).toStrictEqual(4);
  expect(transactionRequest.instructions[0]!.programAddress).toStrictEqual(
    "ComputeBudget111111111111111111111111111111",
  );
  expect(transactionRequest.instructions[0]!.data).toStrictEqual(
    new Uint8Array([2, 32, 161, 7, 0]),
  );
  expect(transactionRequest.recentBlockHash).toStrictEqual(
    "4nTobZxuiA9xZDuSMfSQE6WJSswAkoVoF7ycve42iiy2",
  );
  // Check the invocations content
  expect(transactionFlow).toStrictEqual([
    invocation({
      instruction: instruction({
        programAddress: "ComputeBudget111111111111111111111111111111",
        data: [2, 32, 161, 7, 0],
      }),
    }),
    invocation({
      instruction: instruction({
        programAddress: "ComputeBudget111111111111111111111111111111",
        data: [3, 236, 214, 0, 0, 0, 0, 0, 0],
      }),
    }),
    invocation({
      instruction: instruction({
        programAddress: "11111111111111111111111111111111",
        inputs: [
          i("Hc3EobqKYuqndAYmPzEhokBab3trofMWDafj4PJxFYUL", "ws"),
          i("DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL", "w"),
        ],
        data: [2, 0, 0, 0, 160, 134, 1, 0, 0, 0, 0, 0],
      }),
    }),
    invocation({
      instruction: instruction({
        programAddress: "SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf",
        inputs: [
          i("95YsCnu6P89y8N52qLLTbRog42eypUNqzDi4JYCSCuA", ""),
          i("5tpzxYCp1U2HtKpLtLyH3f4mFcbSD1HoBzy4NaC7pmkS", "w"),
          i("DPbRHiRRDznJLF7nhmTywYcxUWpiNk1QYCPMvJ6rhrQs", ""),
          i("Hc3EobqKYuqndAYmPzEhokBab3trofMWDafj4PJxFYUL", "ws"),
          i("45AMNJMGuojexK1rEBHJSSVFDpTUcoHRcAUmRfLF8hrm", ""),
          i("8PDYaC2zz9UYN3qVoAyZvAF7qRkmTByBT5TnT2mHGPuZ", "w"),
          i("A3EPnkUqt4ueCiJBdnACDnLenyU5xZ57QZsAtnYKA5qx", "w"),
          i("8sWsVPJpjcBrmmuAQCk1Tp6BgAmEc8A5UM8RhJn1qzED", "w"),
          i("BLv19rpwzGkZoJndnR3FXMhkdpqaWiW2i2PvgGzh7kRD", "w"),
          i("PsyMP8fXEEMo2C6C84s8eXuRUrvzQnZyquyjipDRohf", ""),
          i("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", ""),
        ],
        data: [194, 8, 161, 87, 153, 164, 25, 171],
      }),
      flow: [
        { log: "Instruction: VaultTransactionExecute" },
        invocation({
          instruction: instruction({
            programAddress: "PsyMP8fXEEMo2C6C84s8eXuRUrvzQnZyquyjipDRohf",
            inputs: [
              i("8PDYaC2zz9UYN3qVoAyZvAF7qRkmTByBT5TnT2mHGPuZ", "w"),
              i("A3EPnkUqt4ueCiJBdnACDnLenyU5xZ57QZsAtnYKA5qx", "w"),
              i("8sWsVPJpjcBrmmuAQCk1Tp6BgAmEc8A5UM8RhJn1qzED", "w"),
              i("BLv19rpwzGkZoJndnR3FXMhkdpqaWiW2i2PvgGzh7kRD", "w"),
              i("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", ""),
            ],
            data: [11, 36, 247, 105, 0, 212, 165, 190, 42, 0, 0, 0, 0, 0, 0, 0],
          }),
          flow: [
            { log: "Instruction: PoolExtract" },
            invocation({
              instruction: instruction({
                programAddress: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                inputs: [
                  i("BLv19rpwzGkZoJndnR3FXMhkdpqaWiW2i2PvgGzh7kRD", "w"),
                  i("A3EPnkUqt4ueCiJBdnACDnLenyU5xZ57QZsAtnYKA5qx", "w"),
                  i("8sWsVPJpjcBrmmuAQCk1Tp6BgAmEc8A5UM8RhJn1qzED", "w"),
                ],
                data: [3, 42, 0, 0, 0, 0, 0, 0, 0],
              }),
              flow: [
                { log: "Instruction: Transfer" },
                invocation({
                  instruction: instruction({
                    programAddress: "11111111111111111111111111111111",
                  }),
                }),
              ],
              result: { consumedComputeUnits: 4645 },
            }),
          ],
          result: { consumedComputeUnits: 13848 },
        }),
        invocation({
          instruction: instruction({
            programAddress: "11111111111111111111111111111111",
          }),
        }),
      ],
      result: { consumedComputeUnits: 41931 },
    }),
  ]);
});

function invocation(value: {
  instruction: Instruction;
  flow?: TransactionFlow;
  result?: {
    error?: string | undefined;
    returnData?: Uint8Array | undefined;
    consumedComputeUnits?: number | undefined;
  };
}) {
  return {
    invocation: {
      instruction: value.instruction,
      flow: value.flow ?? [],
      error: value.result?.error,
      returnData: value.result?.returnData,
      consumedComputeUnits: value.result?.consumedComputeUnits,
    },
  };
}

function instruction(value: {
  programAddress: string;
  inputs?: Array<InstructionInput>;
  data?: Array<number>;
}): Instruction {
  return {
    programAddress: pubkeyFromBase58(value.programAddress),
    inputs: value.inputs ?? [],
    data: new Uint8Array(value.data ?? []),
  };
}

function i(address: string, mode: string) {
  return {
    address: pubkeyFromBase58(address),
    signer: mode.includes("s"),
    writable: mode.includes("w"),
  };
}
