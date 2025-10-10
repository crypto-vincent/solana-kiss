import { base58Decode } from "../data/Base58";
import { Instruction, InstructionInput } from "../data/Instruction";
import {
  jsonCodecBlockHash,
  jsonCodecBlockSlot,
  jsonCodecNumber,
  jsonCodecPubkey,
  jsonCodecRaw,
  jsonCodecSignature,
  jsonCodecString,
  jsonDecoderArray,
  jsonDecoderNullable,
  jsonDecoderObject,
  jsonDecoderOptional,
} from "../data/Json";
import { Pubkey } from "../data/Pubkey";
import { Signature, signatureToBase58 } from "../data/Signature";
import { RpcHttp } from "./RpcHttp";
import { RpcTransactionExecution, RpcTransactionFlow } from "./RpcTransaction";

export async function rpcHttpGetTransaction(
  rpcHttp: RpcHttp,
  transactionId: Signature,
  options?: {
    skipFlow?: boolean;
  },
): Promise<
  | {
      transactionExecution: RpcTransactionExecution;
      transactionFlow: RpcTransactionFlow | undefined;
    }
  | undefined
> {
  const result = resultJsonDecoder(
    await rpcHttp("getTransaction", [signatureToBase58(transactionId)], {
      encoding: "json",
      maxSupportedTransactionVersion: 0,
    }),
  );
  if (result === undefined) {
    return undefined;
  }
  const meta = result.meta;
  const loadedAddresses = meta.loadedAddresses;
  const message = result.transaction.message;
  const header = message.header;
  const accountKeys = message.accountKeys;
  if (accountKeys.length <= 0) {
    throw new Error("RpcHttp: Invalid transaction with no accounts keys");
  }
  const instructionsInputs = decompileInstructionsInputs(
    header.numRequiredSignatures,
    header.numReadonlySignedAccounts,
    header.numReadonlyUnsignedAccounts,
    accountKeys,
    loadedAddresses?.writable ?? [],
    loadedAddresses?.readonly ?? [],
  );
  const messageInstructions = decompileMessageInstructions(
    instructionsInputs,
    message.instructions,
  );
  const transactionExecution = {
    blockInfo: {
      time: result.blockTime ? new Date(result.blockTime * 1000) : undefined,
      slot: result.slot,
    },
    message: {
      payerAddress: accountKeys[0]!,
      instructions: messageInstructions,
      recentBlockHash: message.recentBlockhash,
    },
    chargedFeesLamports: BigInt(meta.fee),
    consumedComputeUnits: meta.computeUnitsConsumed,
    logs: meta.logMessages, // TODO - parse logs for invocations and event data
    error: meta.err, // TODO - parse error to find custom program errors ?
  };
  if (options?.skipFlow || meta.innerInstructions === undefined) {
    return { transactionExecution, transactionFlow: undefined };
  }
  /*
  const transactionFlow = decompileTransactionFlow(
    messageInstructions,
    instructionsInputs,
    meta.innerInstructions,
  );
  completeTransactionFlow(transactionFlow, meta.logMessages ?? []);
  */
  return { transactionExecution, transactionFlow: undefined };
}

function decompileInstructionsInputs(
  requiredSignaturesCount: number,
  readonlySignedAccountsCount: number,
  readonlyUnsignedAccountsCount: number,
  staticAddresses: Array<Pubkey>,
  loadedWritableAddresses: Array<Pubkey>,
  loadedReadonlyAddresses: Array<Pubkey>,
) {
  const signingAddresses = new Set<Pubkey>();
  for (
    let signerIndex = 0;
    signerIndex < requiredSignaturesCount;
    signerIndex++
  ) {
    signingAddresses.add(expectItemInArray(staticAddresses, signerIndex));
  }
  const readonlyAddresses = new Set<Pubkey>();
  for (
    let readonlyIndex = requiredSignaturesCount - readonlySignedAccountsCount;
    readonlyIndex < requiredSignaturesCount;
    readonlyIndex++
  ) {
    readonlyAddresses.add(expectItemInArray(staticAddresses, readonlyIndex));
  }
  for (
    let readonlyIndex = staticAddresses.length - readonlyUnsignedAccountsCount;
    readonlyIndex < staticAddresses.length;
    readonlyIndex++
  ) {
    readonlyAddresses.add(expectItemInArray(staticAddresses, readonlyIndex));
  }
  for (const loadedReadonlyAddress of loadedReadonlyAddresses) {
    readonlyAddresses.add(loadedReadonlyAddress);
  }
  const inputsAddresses = new Array<Pubkey>();
  inputsAddresses.push(...staticAddresses);
  inputsAddresses.push(...loadedWritableAddresses);
  inputsAddresses.push(...loadedReadonlyAddresses);
  const instructionsInputs = new Array<InstructionInput>();
  for (const inputAddress of inputsAddresses) {
    instructionsInputs.push({
      address: inputAddress,
      signing: signingAddresses.has(inputAddress),
      writable: !readonlyAddresses.has(inputAddress),
    });
  }
  return instructionsInputs;
}

function decompileMessageInstructions(
  instructionsInputs: Array<InstructionInput>,
  compiledInstructions: Array<CompiledInstruction>,
): Array<Instruction> {
  const instructions = new Array<Instruction>();
  for (const compiledInstruction of compiledInstructions) {
    const stackIndex = compiledInstruction.stackHeight - 1;
    if (stackIndex !== 0) {
      throw new Error(
        `RpcHttp: Expected instruction stack index to be 0 (found ${stackIndex})`,
      );
    }
    instructions.push(
      decompileMessageInstruction(compiledInstruction, instructionsInputs),
    );
  }
  return instructions;
}

/*
function decompileTransactionFlow(
  messageInstructions: Array<Instruction>,
  instructionsInputs: Array<InstructionInput>,
  compiledInnerInstructions: Array<{
    index: number;
    instructions: Array<CompiledInstruction>;
  }>,
): RpcTransactionFlow {
  const rootInvocations: RpcTransactionFlow = new Array();
  for (let index = 0; index < messageInstructions.length; index++) {
    rootInvocations.push({
      instruction: messageInstructions[index]!,
      invocations: [],
    });
  }
  for (const compiledInnerInstructionBlock of compiledInnerInstructions) {
    const rootInvocation = expectItemInArray(
      rootInvocations,
      compiledInnerInstructionBlock.index,
    );
    const invocationStack = new Array<RpcTransactionInvocation>();
    invocationStack.push(rootInvocation);
    for (const compiledInnerInstruction of compiledInnerInstructionBlock.instructions) {
      const innerInvocation = {
        instruction: decompileMessageInstruction(
          compiledInnerInstruction,
          instructionsInputs,
        ),
        invocations: [],
      };
      const stackIndex = compiledInnerInstruction.stackHeight - 1;
      if (stackIndex < 1 || stackIndex > invocationStack.length) {
        throw new Error(
          `RpcHttp: Expected inner instruction stack height to be between 2 and ${invocationStack.length + 1} (found: ${stackIndex + 1})`,
        );
      }
      if (stackIndex === invocationStack.length) {
        invocationStack[stackIndex - 1]!.invocations.push(innerInvocation);
        invocationStack.push(innerInvocation);
      } else {
        while (stackIndex < invocationStack.length - 1) {
          invocationStack.pop();
        }
        invocationStack[stackIndex - 1]!.invocations.push(innerInvocation);
        invocationStack[stackIndex] = innerInvocation;
      }
    }
  }
  return rootInvocations;
}

function stripPrefix(s: string, prefix: string): string | undefined {
  return s.startsWith(prefix) ? s.slice(prefix.length) : undefined;
}

function completeTransactionFlow(
  invocation: RpcTransactionInvocation,
  logs: Array<string>,
  logIndex: number,
  depth: number,
) {
  const debug = [];

  let inner = 0;

  while (logIndex + 1 < logs.length) {
    logIndex++;
    const logLine = logs[logIndex]!;

    const logRegular = stripPrefix(logLine, "Program log: ");
    if (logRegular !== undefined) {
      invocation.events.push({ log: logRegular });
      debug.push([" >>".repeat(inner), "Log", logRegular].join(" "));
      continue;
    }
    const logData = stripPrefix(logLine, "Program data: ");
    if (logData !== undefined) {
      invocation.events.push({ data: base64Decode(logData) });
      debug.push([" >>".repeat(inner), "Data", logData].join(" "));
      continue;
    }
    const logReturn = stripPrefix(logLine, "Program return: ");
    if (logReturn !== undefined) {
      invocation.execution.returnData = base64Decode(logReturn);
      debug.push([" >>".repeat(inner), "Return", logReturn].join(" "));
      continue;
    }

    const logStack = stripPrefix(logLine, "Program ");
    if (logStack !== undefined) {
      const logsParts = logStack.split(" ");
      if (logsParts.length >= 2) {
        const logProgramAddress = pubkeyFromBase58(logsParts[0]!);
        const logStackKind = logsParts[1]!;
        if (logStackKind === "invoke") {
        }
      }

      if (logProgramAddress === undefined || logInfo === undefined) {
        throw new Error(`RpcHttp: Invalid program stack log: ${logLine}`);
      }
      const programAddress = pubkeyFromBase58(logProgramAddress);
      if (logInfo.startsWith("invoke")) {
        const invokeIndex = logInfo.indexOf("invoke") + "invoke".length;
        const invokeDepth = parseInt(logInfo.slice(invokeIndex).trim());
        inner++;
        debug.push(
          [" >>".repeat(inner), "Invoke", programAddress, inner].join(" "),
        );
        continue;
      } else if (logInfo.startsWith("consumed")) {
        debug.push(
          [" >>".repeat(inner), "Consumed", programAddress, inner].join(" "),
        );
        continue;
      } else if (logInfo.startsWith("success")) {
        debug.push(
          [" >>".repeat(inner), "Success", programAddress, inner].join(" "),
        );
        inner--;
        continue;
      } else if (logInfo.startsWith("failed")) {
        debug.push(
          [" >>".repeat(inner), "Failed", programAddress, inner].join(" "),
        );
        inner--;
        continue;
      }
    }

    debug.push([" >>".repeat(inner), "Unknown log", logLine].join(" "));
    logIndex++;
  }

  console.log("Log decompilation", "\n" + debug.join("\n"));
}
*/

type CompiledInstruction = {
  stackHeight: number;
  programIndex: number;
  accountsIndexes: Array<number>;
  dataBase58: string;
};

function decompileMessageInstruction(
  compiledInstruction: CompiledInstruction,
  instructionsInputs: Array<InstructionInput>,
): Instruction {
  const instructionProgram = expectItemInArray(
    instructionsInputs,
    compiledInstruction.programIndex,
  );
  const instructionInputs = new Array<InstructionInput>();
  for (const accountIndex of compiledInstruction.accountsIndexes) {
    instructionInputs.push(expectItemInArray(instructionsInputs, accountIndex));
  }
  return {
    programAddress: instructionProgram.address,
    inputs: instructionInputs,
    data: base58Decode(compiledInstruction.dataBase58),
  };
}

const compiledInstructionsJsonDecoder = jsonDecoderArray(
  jsonDecoderObject(
    {
      stackHeight: jsonCodecNumber.decoder,
      programIndex: jsonCodecNumber.decoder,
      accountsIndexes: jsonDecoderArray(jsonCodecNumber.decoder),
      dataBase58: jsonCodecString.decoder,
    },
    {
      stackHeight: "stackHeight",
      programIndex: "programIdIndex",
      accountsIndexes: "accounts",
      dataBase58: "data",
    },
  ),
);

const resultJsonDecoder = jsonDecoderOptional(
  jsonDecoderObject({
    blockTime: jsonDecoderOptional(jsonCodecNumber.decoder),
    meta: jsonDecoderObject({
      computeUnitsConsumed: jsonCodecNumber.decoder,
      err: jsonDecoderNullable(jsonCodecRaw.decoder),
      fee: jsonCodecNumber.decoder,
      innerInstructions: jsonDecoderOptional(
        jsonDecoderArray(
          jsonDecoderObject({
            index: jsonCodecNumber.decoder,
            instructions: compiledInstructionsJsonDecoder,
          }),
        ),
      ),
      loadedAddresses: jsonDecoderOptional(
        jsonDecoderObject({
          writable: jsonDecoderArray(jsonCodecPubkey.decoder),
          readonly: jsonDecoderArray(jsonCodecPubkey.decoder),
        }),
      ),
      logMessages: jsonDecoderOptional(
        jsonDecoderArray(jsonCodecString.decoder),
      ),
    }),
    slot: jsonCodecBlockSlot.decoder,
    transaction: jsonDecoderObject({
      message: jsonDecoderObject({
        accountKeys: jsonDecoderArray(jsonCodecPubkey.decoder),
        addressTableLookups: jsonDecoderOptional(
          jsonDecoderArray(
            jsonDecoderObject({
              accountKey: jsonCodecPubkey.decoder,
              readonlyIndexes: jsonDecoderArray(jsonCodecNumber.decoder),
              writableIndexes: jsonDecoderArray(jsonCodecNumber.decoder),
            }),
          ),
        ),
        header: jsonDecoderObject({
          numReadonlySignedAccounts: jsonCodecNumber.decoder,
          numReadonlyUnsignedAccounts: jsonCodecNumber.decoder,
          numRequiredSignatures: jsonCodecNumber.decoder,
        }),
        instructions: compiledInstructionsJsonDecoder,
        recentBlockhash: jsonCodecBlockHash.decoder,
      }),
      signatures: jsonDecoderArray(jsonCodecSignature.decoder),
    }),
  }),
);

function expectItemInArray<T>(array: Array<T>, index: number): T {
  if (index < 0 || index >= array.length) {
    throw new Error(
      `Array index ${index} out of bounds (length: ${array.length})`,
    );
  }
  return array[index]!;
}
