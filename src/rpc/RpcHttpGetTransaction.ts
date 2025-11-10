import { base58Decode } from "../data/Base58";
import { base64Decode } from "../data/Base64";
import { Instruction, InstructionInput } from "../data/Instruction";
import {
  jsonCodecBlockHash,
  jsonCodecBlockSlot,
  jsonCodecNumber,
  jsonCodecPubkey,
  jsonCodecSignature,
  jsonCodecString,
  jsonDecoderAnyOfKinds,
  jsonDecoderArray,
  jsonDecoderNullable,
  jsonDecoderObject,
  jsonDecoderOptional,
  JsonObject,
} from "../data/Json";
import { Pubkey, pubkeyFromBase58 } from "../data/Pubkey";
import {
  TransactionExecution,
  TransactionFlow,
  TransactionHandle,
  TransactionInvocation,
  TransactionRequest,
} from "../data/Transaction";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpGetTransaction(
  self: RpcHttp,
  transactionHandle: TransactionHandle,
  options?: { skipTransactionFlow?: boolean },
): Promise<
  | {
      transactionRequest: TransactionRequest;
      transactionExecution: TransactionExecution;
      transactionFlow: TransactionFlow | undefined;
    }
  | undefined
> {
  const result = resultJsonDecoder(
    await self("getTransaction", [transactionHandle], {
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
  const instructions = decompileInstructions(
    instructionsInputs,
    message.instructions,
  );
  const transactionRequest = {
    payerAddress: accountKeys[0]!,
    recentBlockHash: message.recentBlockhash,
    instructions,
  };
  const transactionExecution = {
    blockInfo: {
      time: result.blockTime ? new Date(result.blockTime * 1000) : undefined,
      slot: result.slot,
    },
    logs: meta.logMessages,
    error: meta.err, // TODO - parse error to find custom program errors ?
    consumedComputeUnits: meta.computeUnitsConsumed,
    chargedFeesLamports: meta.fee ? BigInt(meta.fee) : undefined,
  };
  if (
    options?.skipTransactionFlow ||
    meta.innerInstructions === undefined ||
    meta.logMessages === undefined
  ) {
    return {
      transactionRequest,
      transactionExecution,
      transactionFlow: undefined,
    };
  }
  const instructionsCallStacks = decompileInstructionsCallStacks(
    instructions,
    instructionsInputs,
    meta.innerInstructions,
  );
  const rootInvocation = {
    instruction: {} as Instruction,
    flow: [],
    error: undefined,
    returned: undefined,
    consumedComputeUnits: undefined,
  };
  const afterParsing = parseTransactionInvocations(
    rootInvocation,
    instructionsCallStacks,
    meta.logMessages,
    -1,
  );
  if (rootInvocation.error !== undefined) {
    throw new Error(
      `RpcHttp: Unable to parse transaction callstack (found error at root level: ${rootInvocation.error})`,
    );
  }
  if (rootInvocation.returned !== undefined) {
    throw new Error(
      `RpcHttp: Unable to parse transaction callstack (found returned data at root level: ${rootInvocation.returned})`,
    );
  }
  if (rootInvocation.consumedComputeUnits !== undefined) {
    throw new Error(
      `RpcHttp: Unable to parse transaction callstack (found consumed compute units at root level: ${rootInvocation.consumedComputeUnits})`,
    );
  }
  if (afterParsing.logIndex + 1 !== meta.logMessages.length) {
    throw new Error(
      `RpcHttp: Unable to parse transaction callstack (only parsed ${afterParsing.logIndex + 1} out of ${meta.logMessages.length} log messages)`,
    );
  }
  return {
    transactionRequest,
    transactionExecution,
    transactionFlow: rootInvocation.flow,
  };
}

function decompileInstructionsInputs(
  signatureCount: number,
  readonlySignedCount: number,
  readonlyUnsignedCount: number,
  staticAddresses: Array<Pubkey>,
  loadedWritableAddresses: Array<Pubkey>,
  loadedReadonlyAddresses: Array<Pubkey>,
) {
  const signersAddresses = new Set<Pubkey>();
  for (let signerIndex = 0; signerIndex < signatureCount; signerIndex++) {
    signersAddresses.add(expectItemInArray(staticAddresses, signerIndex));
  }
  const readonlyAddresses = new Set<Pubkey>();
  for (
    let readonlyIndex = signatureCount - readonlySignedCount;
    readonlyIndex < signatureCount;
    readonlyIndex++
  ) {
    readonlyAddresses.add(expectItemInArray(staticAddresses, readonlyIndex));
  }
  for (
    let readonlyIndex = staticAddresses.length - readonlyUnsignedCount;
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
      signer: signersAddresses.has(inputAddress),
      writable: !readonlyAddresses.has(inputAddress),
    });
  }
  return instructionsInputs;
}

type InstructionCompiled = {
  stackHeight: number;
  programIndex: number;
  accountsIndexes: Array<number>;
  dataBase58: string;
};

function decompileInstructions(
  instructionsInputs: Array<InstructionInput>,
  instructionsCompiled: Array<InstructionCompiled>,
): Array<Instruction> {
  const instructions = new Array<Instruction>();
  for (const instructionCompiled of instructionsCompiled) {
    const stackIndex = instructionCompiled.stackHeight - 1;
    if (stackIndex !== 0) {
      throw new Error(
        `RpcHttp: Expected instruction stack index to be 0 (found ${stackIndex})`,
      );
    }
    instructions.push(
      decompileInstruction(instructionCompiled, instructionsInputs),
    );
  }
  return instructions;
}

function decompileInstruction(
  instructionCompiled: InstructionCompiled,
  instructionsInputs: Array<InstructionInput>,
): Instruction {
  const instructionProgram = expectItemInArray(
    instructionsInputs,
    instructionCompiled.programIndex,
  );
  const instructionInputs = new Array<InstructionInput>();
  for (const accountIndex of instructionCompiled.accountsIndexes) {
    instructionInputs.push(expectItemInArray(instructionsInputs, accountIndex));
  }
  return {
    programAddress: instructionProgram.address,
    inputs: instructionInputs,
    data: base58Decode(instructionCompiled.dataBase58),
  };
}

type InstructionCallStack = {
  instructionCall: Instruction;
  callStack: Array<InstructionCallStack>;
};

function decompileInstructionsCallStacks(
  instructions: Array<Instruction>,
  instructionsInputs: Array<InstructionInput>,
  compiledInnerInstructions: Array<{
    index: number;
    instructions: Array<InstructionCompiled>;
  }>,
): Array<InstructionCallStack> {
  const rootInvocations = new Array<InstructionCallStack>();
  for (let index = 0; index < instructions.length; index++) {
    rootInvocations.push({
      instructionCall: instructions[index]!,
      callStack: [],
    });
  }
  for (const compiledInnerInstructionBlock of compiledInnerInstructions) {
    const rootInvocation = expectItemInArray(
      rootInvocations,
      compiledInnerInstructionBlock.index,
    );
    const stackInvocation = new Array<InstructionCallStack>();
    stackInvocation.push(rootInvocation);
    for (const compiledInnerInstruction of compiledInnerInstructionBlock.instructions) {
      const innerInvocation: InstructionCallStack = {
        instructionCall: decompileInstruction(
          compiledInnerInstruction,
          instructionsInputs,
        ),
        callStack: [],
      };
      const stackDepthIndex = compiledInnerInstruction.stackHeight - 1;
      if (stackDepthIndex < 1 || stackDepthIndex > stackInvocation.length) {
        throw new Error(
          `RpcHttp: Expected inner instruction stack height to be between 2 and ${stackInvocation.length + 1} (found: ${stackDepthIndex + 1})`,
        );
      }
      if (stackDepthIndex === stackInvocation.length) {
        stackInvocation[stackDepthIndex - 1]!.callStack.push(innerInvocation);
        stackInvocation.push(innerInvocation);
      } else {
        while (stackDepthIndex < stackInvocation.length - 1) {
          stackInvocation.pop();
        }
        stackInvocation[stackDepthIndex - 1]!.callStack.push(innerInvocation);
        stackInvocation[stackDepthIndex] = innerInvocation;
      }
    }
  }
  return rootInvocations;
}

function parseTransactionInvocations(
  invocation: TransactionInvocation,
  instructionsCallStacks: Array<InstructionCallStack>,
  logs: Array<string>,
  logIndex: number,
): { logIndex: number } {
  function stripPrefix(s: string, prefix: string): string | undefined {
    return s.startsWith(prefix) ? s.slice(prefix.length) : undefined;
  }
  let invocationIndex = 0;
  while (logIndex + 1 < logs.length) {
    logIndex++;
    const logLine = logs[logIndex]!;
    const logRegular = stripPrefix(logLine, "Program log: ");
    if (logRegular !== undefined) {
      invocation.flow.push({ log: logRegular });
      continue;
    }
    const logData = stripPrefix(logLine, "Program data: ");
    if (logData !== undefined) {
      invocation.flow.push({ data: base64Decode(logData) });
      continue;
    }
    const logReturn = stripPrefix(logLine, "Program return: ");
    if (logReturn !== undefined) {
      const parts = logReturn.split(" ");
      if (parts.length !== 2) {
        throw new Error(`RpcHttp: Unexpected return log: ${logLine}`);
      }
      const returnProgramAddress = pubkeyFromBase58(parts[0]!);
      if (invocation.instruction.programAddress !== returnProgramAddress) {
        throw new Error(
          `RpcHttp: Unexpected return log program address (expected ${invocation.instruction.programAddress}, found ${returnProgramAddress}): ${logLine}`,
        );
      }
      invocation.returned = base64Decode(parts[1]!);
      continue;
    }
    const logProgram = stripPrefix(logLine, "Program ");
    if (logProgram !== undefined) {
      const logsProgramParts = logProgram.split(" ");
      if (logsProgramParts.length >= 2) {
        const logProgramAddress = pubkeyFromBase58(logsProgramParts[0]!);
        const logProgramKind = logsProgramParts[1]!;
        if (logProgramKind === "invoke") {
          const instructionInvocation = instructionsCallStacks[invocationIndex];
          invocationIndex++;
          if (instructionInvocation === undefined) {
            throw new Error(`RpcHttp: Unexpected invoke log: ${logLine}`);
          }
          if (
            instructionInvocation.instructionCall.programAddress !==
            logProgramAddress
          ) {
            throw new Error(
              `RpcHttp: Unexpected invoke log program address (expected ${instructionInvocation.instructionCall.programAddress}, found ${logProgramAddress}): ${logLine}`,
            );
          }
          const innerInvocation = {
            instruction: instructionInvocation.instructionCall,
            flow: [],
            error: undefined,
            returned: undefined,
            consumedComputeUnits: undefined,
          };
          const afterParsing = parseTransactionInvocations(
            innerInvocation,
            instructionInvocation.callStack,
            logs,
            logIndex,
          );
          logIndex = afterParsing.logIndex;
          invocation.flow.push({ invocation: innerInvocation });
          continue;
        }
        if (logProgramKind === "consumed") {
          invocation.consumedComputeUnits = Number(logsProgramParts[2]);
          continue;
        }
        if (logProgramKind === "success") {
          invocation.error = undefined;
          return { logIndex };
        }
        if (logProgramKind === "failed:") {
          invocation.error = logsProgramParts.slice(2).join(" ");
          return { logIndex };
        }
      }
    }
    invocation.flow.push({ unknown: logLine });
  }
  return { logIndex };
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
      keysEncoding: {
        stackHeight: "stackHeight",
        programIndex: "programIdIndex",
        accountsIndexes: "accounts",
        dataBase58: "data",
      },
    },
  ),
);

const resultJsonDecoder = jsonDecoderOptional(
  jsonDecoderObject({
    blockTime: jsonDecoderOptional(jsonCodecNumber.decoder),
    meta: jsonDecoderObject({
      computeUnitsConsumed: jsonCodecNumber.decoder,
      err: jsonDecoderNullable(
        jsonDecoderAnyOfKinds<string | JsonObject>({
          object: (object) => object,
          string: (string) => string,
        }),
      ),
      fee: jsonDecoderOptional(jsonCodecNumber.decoder),
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
