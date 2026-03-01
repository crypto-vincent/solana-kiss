import { expect, it } from "@jest/globals";
import {
  ExecutionFlow,
  ExecutionInvocation,
  expectDefined,
  InstructionInput,
  InstructionRequest,
  pubkeyFromBase58,
  rpcHttpFromUrl,
  rpcHttpGetTransaction,
  signatureFromBase58,
  urlRpcPublicMainnet,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl(urlRpcPublicMainnet);
  // Complex transaction with many inner instructions nested
  const { transactionRequest, executionReport, executionFlow } = expectDefined(
    await rpcHttpGetTransaction(
      rpcHttp,
      signatureFromBase58(
        "5c4TRGCXbv6ChbTpTnmFzt3WFqpWMMSAKdEqiqCFzG7hTFTWxdHpv2VxfQBzG3VwvQ2mMyG4rvV2eTN68jrLKy3U",
      ),
    ),
  );
  expect(transactionRequest.payerAddress).toStrictEqual(
    "Ewfot2ZKhuGuEWaSRyFpe3LpK9xSEEUrDZk4AQpTazAR",
  );
  expect(transactionRequest.recentBlockHash).toStrictEqual(
    "ETzLkjyxUNupAQxQRnTuG2u7wnQCWEgtdTLegeQycCPv",
  );
  expect(executionReport.transactionError).toStrictEqual(null);
  // Check the invocations tree shape
  const createParams = new Uint8Array(410);
  expect(executionFlow).toStrictEqual([
    inv({
      instructionRequest: ix({
        programAddress: "ComputeBudget111111111111111111111111111111",
        data: [2, 32, 161, 7, 0],
      }),
    }),
    inv({
      instructionRequest: ix({
        programAddress: "ComputeBudget111111111111111111111111111111",
        data: [3, 112, 17, 1, 0, 0, 0, 0, 0],
      }),
    }),
    inv({
      instructionRequest: ix({
        programAddress: "11111111111111111111111111111111",
        inputs: [
          i("Ewfot2ZKhuGuEWaSRyFpe3LpK9xSEEUrDZk4AQpTazAR", "ws"),
          i("DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL", "w"),
        ],
        data: [2, 0, 0, 0, 160, 134, 1, 0, 0, 0, 0, 0],
      }),
    }),
    inv({
      instructionRequest: ix({
        programAddress: "SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf",
        inputs: [
          i("95YsCnu6P89y8N52qLLTbRog42eypUNqzDi4JYCSCuA", ""),
          i("9HLo1KDmyY8xkqz6wyd31qUdBHLK5jyxtkEkguXdaZ24", "w"),
          i("FnapEgNwU7rbxZEbTmi3TjQHGcMx5USufajmqtsHSqth", ""),
          i("Ewfot2ZKhuGuEWaSRyFpe3LpK9xSEEUrDZk4AQpTazAR", "ws"),
          i("45AMNJMGuojexK1rEBHJSSVFDpTUcoHRcAUmRfLF8hrm", ""),
          i("8PDYaC2zz9UYN3qVoAyZvAF7qRkmTByBT5TnT2mHGPuZ", "w"),
          i("8sWsVPJpjcBrmmuAQCk1Tp6BgAmEc8A5UM8RhJn1qzED", "w"),
          i("BLv19rpwzGkZoJndnR3FXMhkdpqaWiW2i2PvgGzh7kRD", "w"),
          i("PsyMP8fXEEMo2C6C84s8eXuRUrvzQnZyquyjipDRohf", ""),
          i("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", ""),
          i("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", ""),
          i("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", ""),
          i("11111111111111111111111111111111", ""),
        ],
        data: [194, 8, 161, 87, 153, 164, 25, 171],
      }),
      innerExecutionFlow: [
        { log: "Instruction: VaultTransactionExecute" },
        inv({
          instructionRequest: ix({
            programAddress: "PsyMP8fXEEMo2C6C84s8eXuRUrvzQnZyquyjipDRohf",
            inputs: [
              i("8PDYaC2zz9UYN3qVoAyZvAF7qRkmTByBT5TnT2mHGPuZ", "w"),
              i("8PDYaC2zz9UYN3qVoAyZvAF7qRkmTByBT5TnT2mHGPuZ", "w"),
              i("8sWsVPJpjcBrmmuAQCk1Tp6BgAmEc8A5UM8RhJn1qzED", "w"),
              i("BLv19rpwzGkZoJndnR3FXMhkdpqaWiW2i2PvgGzh7kRD", "w"),
              i("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", ""),
              i("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", ""),
              i("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", ""),
              i("11111111111111111111111111111111", ""),
            ],
            data: [
              [55, 151, 27, 224, 136, 247, 199, 235],
              Array.from(createParams),
            ].flat(),
          }),
          innerExecutionFlow: [
            { log: "Instruction: PoolCreate" },
            inv({
              instructionRequest: ix({
                programAddress: "11111111111111111111111111111111",
                inputs: [
                  i("8PDYaC2zz9UYN3qVoAyZvAF7qRkmTByBT5TnT2mHGPuZ", "w"),
                  i("8sWsVPJpjcBrmmuAQCk1Tp6BgAmEc8A5UM8RhJn1qzED", "w"),
                ],
                data: [
                  0, 0, 0, 0, 128, 55, 72, 0, 0, 0, 0, 0, 40, 2, 0, 0, 0, 0, 0,
                  0, 5, 220, 105, 90, 248, 108, 44, 154, 131, 181, 49, 53, 202,
                  179, 79, 86, 224, 229, 132, 215, 152, 39, 45, 61, 220, 191,
                  239, 53, 227, 144, 199, 206,
                ],
              }),
            }),
            inv({
              instructionRequest: ix({
                programAddress: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
                inputs: [
                  i("8PDYaC2zz9UYN3qVoAyZvAF7qRkmTByBT5TnT2mHGPuZ", "w"),
                  i("BLv19rpwzGkZoJndnR3FXMhkdpqaWiW2i2PvgGzh7kRD", "w"),
                  i("8sWsVPJpjcBrmmuAQCk1Tp6BgAmEc8A5UM8RhJn1qzED", "w"),
                  i("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", ""),
                  i("11111111111111111111111111111111", ""),
                  i("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", ""),
                ],
                data: [0],
              }),
              innerExecutionFlow: [
                { log: "Create" },
                inv({
                  instructionRequest: ix({
                    programAddress:
                      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                    inputs: [
                      i("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", ""),
                    ],
                    data: [21, 7, 0],
                  }),
                  innerExecutionFlow: [
                    { log: "Instruction: GetAccountDataSize" },
                  ],
                  result: {
                    returned: [165, 0, 0, 0, 0, 0, 0, 0],
                    consumedComputeUnits: 1622,
                  },
                }),
                inv({
                  instructionRequest: ix({
                    programAddress: "11111111111111111111111111111111",
                    inputs: [
                      i("8PDYaC2zz9UYN3qVoAyZvAF7qRkmTByBT5TnT2mHGPuZ", "w"),
                      i("BLv19rpwzGkZoJndnR3FXMhkdpqaWiW2i2PvgGzh7kRD", "w"),
                    ],
                    data: [
                      0, 0, 0, 0, 240, 29, 31, 0, 0, 0, 0, 0, 165, 0, 0, 0, 0,
                      0, 0, 0, 6, 221, 246, 225, 215, 101, 161, 147, 217, 203,
                      225, 70, 206, 235, 121, 172, 28, 180, 133, 237, 95, 91,
                      55, 145, 58, 140, 245, 133, 126, 255, 0, 169,
                    ],
                  }),
                }),
                { log: "Initialize the associated token account" },
                inv({
                  instructionRequest: ix({
                    programAddress:
                      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                    inputs: [
                      i("BLv19rpwzGkZoJndnR3FXMhkdpqaWiW2i2PvgGzh7kRD", "w"),
                    ],
                    data: [22],
                  }),
                  innerExecutionFlow: [
                    {
                      log: "Instruction: InitializeImmutableOwner",
                    },
                    {
                      log: "Please upgrade to SPL Token 2022 for immutable owner support",
                    },
                  ],
                  result: { consumedComputeUnits: 1405 },
                }),
                inv({
                  instructionRequest: ix({
                    programAddress:
                      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                    inputs: [
                      i("BLv19rpwzGkZoJndnR3FXMhkdpqaWiW2i2PvgGzh7kRD", "w"),
                      i("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", ""),
                    ],
                    data: [
                      18, 116, 242, 159, 166, 19, 7, 185, 227, 29, 234, 100,
                      229, 133, 109, 136, 56, 141, 204, 162, 159, 6, 103, 180,
                      194, 157, 194, 135, 102, 47, 149, 8, 226,
                    ],
                  }),
                  innerExecutionFlow: [
                    { log: "Instruction: InitializeAccount3" },
                  ],
                  result: { consumedComputeUnits: 4241 },
                }),
              ],
              result: { consumedComputeUnits: 20544 },
            }),
          ],
          result: { consumedComputeUnits: 37287 },
        }),
      ],
      result: { consumedComputeUnits: 67334 },
    }),
  ]);
});

function inv(value: {
  instructionRequest: InstructionRequest;
  innerExecutionFlow?: ExecutionFlow;
  result?: {
    error?: string;
    returned?: Array<number>;
    consumedComputeUnits?: number;
  };
}): { invocation: ExecutionInvocation } {
  return {
    invocation: {
      instructionRequest: value.instructionRequest,
      innerExecutionFlow: value.innerExecutionFlow ?? [],
      instructionError: value.result?.error,
      instructionReturned: value.result?.returned
        ? new Uint8Array(value.result.returned)
        : undefined,
      consumedComputeUnits: value.result?.consumedComputeUnits,
    },
  };
}

function ix(value: {
  programAddress: string;
  inputs?: Array<InstructionInput>;
  data?: Array<number>;
}): InstructionRequest {
  return {
    programAddress: pubkeyFromBase58(value.programAddress),
    instructionInputs: value.inputs ?? [],
    instructionData: new Uint8Array(value.data ?? []),
  };
}

function i(address: string, mode: string) {
  return {
    address: pubkeyFromBase58(address),
    signer: mode.includes("s"),
    writable: mode.includes("w"),
  };
}
