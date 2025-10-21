import { base58Decode } from "../data/Base58";
import { base64Decode } from "../data/Base64";
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
import { Pubkey, pubkeyFromBase58 } from "../data/Pubkey";
import { Signature, signatureToBase58 } from "../data/Signature";
import { RpcHttp } from "./RpcHttp";
import {
  RpcTransactionCallStack,
  RpcTransactionExecution,
  RpcTransactionInvoke,
} from "./RpcTransaction";

export async function rpcHttpGetTransaction(
  rpcHttp: RpcHttp,
  transactionId: Signature,
  options?: {
    skipCallStack?: boolean;
  },
): Promise<
  | {
      transactionExecution: RpcTransactionExecution;
      transactionCallStack: RpcTransactionCallStack | undefined;
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
      recentBlockHash: message.recentBlockhash,
      instructions: messageInstructions,
    },
    logs: meta.logMessages,
    error: meta.err, // TODO - parse error to find custom program errors ?
    consumedComputeUnits: meta.computeUnitsConsumed,
    chargedFeesLamports: meta.fee ? BigInt(meta.fee) : undefined,
  };
  if (
    options?.skipCallStack ||
    meta.innerInstructions === undefined ||
    meta.logMessages === undefined
  ) {
    return { transactionExecution, transactionCallStack: undefined };
  }
  const instructionsCallStack = decompileInstructionsTree(
    messageInstructions,
    instructionsInputs,
    meta.innerInstructions,
  );
  const rootInvoke = {
    instruction: {} as Instruction,
    callStack: [],
    error: undefined,
    returnData: undefined,
    consumedComputeUnits: undefined,
  };
  const afterParsing = parseTransactionCallstack(
    rootInvoke,
    instructionsCallStack,
    meta.logMessages,
    -1,
  );
  if (rootInvoke.error !== undefined) {
    throw new Error(
      `RpcHttp: Unable to parse transaction callstack (found error at root level: ${rootInvoke.error})`,
    );
  }
  if (rootInvoke.returnData !== undefined) {
    throw new Error(
      `RpcHttp: Unable to parse transaction callstack (found return data at root level: ${rootInvoke.returnData})`,
    );
  }
  if (rootInvoke.consumedComputeUnits !== undefined) {
    throw new Error(
      `RpcHttp: Unable to parse transaction callstack (found consumed compute units at root level: ${rootInvoke.consumedComputeUnits})`,
    );
  }
  if (afterParsing.logIndex + 1 !== meta.logMessages.length) {
    throw new Error(
      `RpcHttp: Unable to parse transaction callstack (only parsed ${afterParsing.logIndex + 1} out of ${meta.logMessages.length} log messages)`,
    );
  }
  return {
    transactionExecution,
    transactionCallStack: rootInvoke.callStack,
  };
}

function decompileInstructionsInputs(
  requiredSignaturesCount: number,
  readonlySignedAccountsCount: number,
  readonlyUnsignedAccountsCount: number,
  staticAddresses: Array<Pubkey>,
  loadedWritableAddresses: Array<Pubkey>,
  loadedReadonlyAddresses: Array<Pubkey>,
) {
  const signersAddresses = new Set<Pubkey>();
  for (
    let signerIndex = 0;
    signerIndex < requiredSignaturesCount;
    signerIndex++
  ) {
    signersAddresses.add(expectItemInArray(staticAddresses, signerIndex));
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
      signer: signersAddresses.has(inputAddress),
      writable: !readonlyAddresses.has(inputAddress),
    });
  }
  return instructionsInputs;
}

type CompiledInstruction = {
  stackHeight: number;
  programIndex: number;
  accountsIndexes: Array<number>;
  dataBase58: string;
};

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

type InstructionInvocation = {
  instruction: Instruction;
  invocations: Array<InstructionInvocation>;
};

function decompileInstructionsTree(
  messageInstructions: Array<Instruction>,
  instructionsInputs: Array<InstructionInput>,
  compiledInnerInstructions: Array<{
    index: number;
    instructions: Array<CompiledInstruction>;
  }>,
): Array<InstructionInvocation> {
  const rootInvocations = new Array<InstructionInvocation>();
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
    const stackInvocation = new Array<InstructionInvocation>();
    stackInvocation.push(rootInvocation);
    for (const compiledInnerInstruction of compiledInnerInstructionBlock.instructions) {
      const innerInvocation = {
        instruction: decompileMessageInstruction(
          compiledInnerInstruction,
          instructionsInputs,
        ),
        invocations: [],
      };
      const stackDepthIndex = compiledInnerInstruction.stackHeight - 1;
      if (stackDepthIndex < 1 || stackDepthIndex > stackInvocation.length) {
        throw new Error(
          `RpcHttp: Expected inner instruction stack height to be between 2 and ${stackInvocation.length + 1} (found: ${stackDepthIndex + 1})`,
        );
      }
      if (stackDepthIndex === stackInvocation.length) {
        stackInvocation[stackDepthIndex - 1]!.invocations.push(innerInvocation);
        stackInvocation.push(innerInvocation);
      } else {
        while (stackDepthIndex < stackInvocation.length - 1) {
          stackInvocation.pop();
        }
        stackInvocation[stackDepthIndex - 1]!.invocations.push(innerInvocation);
        stackInvocation[stackDepthIndex] = innerInvocation;
      }
    }
  }
  return rootInvocations;
}

function parseTransactionCallstack(
  invoked: RpcTransactionInvoke,
  instructionsCallStack: Array<InstructionInvocation>,
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
      invoked.callStack.push({ log: logRegular });
      continue;
    }
    const logData = stripPrefix(logLine, "Program data: ");
    if (logData !== undefined) {
      invoked.callStack.push({ data: base64Decode(logData) });
      continue;
    }
    const logReturn = stripPrefix(logLine, "Program return: ");
    if (logReturn !== undefined) {
      const parts = logReturn.split(" ");
      if (parts.length !== 2) {
        throw new Error(`RpcHttp: Unexpected return log: ${logLine}`);
      }
      const returnProgramAddress = pubkeyFromBase58(parts[0]!);
      if (invoked.instruction.programAddress !== returnProgramAddress) {
        throw new Error(
          `RpcHttp: Unexpected return log program address (expected ${invoked.instruction.programAddress}, found ${returnProgramAddress}): ${logLine}`,
        );
      }
      invoked.returnData = base64Decode(parts[1]!);
      continue;
    }
    const logProgram = stripPrefix(logLine, "Program ");
    if (logProgram !== undefined) {
      const logsProgramParts = logProgram.split(" ");
      if (logsProgramParts.length >= 2) {
        const logProgramAddress = pubkeyFromBase58(logsProgramParts[0]!);
        const logProgramKind = logsProgramParts[1]!;
        if (logProgramKind === "invoke") {
          const instructionInvocation = instructionsCallStack[invocationIndex];
          invocationIndex++;
          if (instructionInvocation === undefined) {
            throw new Error(`RpcHttp: Unexpected invoke log: ${logLine}`);
          }
          if (
            instructionInvocation.instruction.programAddress !==
            logProgramAddress
          ) {
            throw new Error(
              `RpcHttp: Unexpected invoke log program address (expected ${instructionInvocation.instruction.programAddress}, found ${logProgramAddress}): ${logLine}`,
            );
          }
          const innerInvoke = {
            instruction: instructionInvocation.instruction,
            callStack: [],
            error: undefined,
            returnData: undefined,
            consumedComputeUnits: undefined,
          };
          const afterParsing = parseTransactionCallstack(
            innerInvoke,
            instructionInvocation.invocations,
            logs,
            logIndex,
          );
          logIndex = afterParsing.logIndex;
          invoked.callStack.push({ invoke: innerInvoke });
          continue;
        }
        if (logProgramKind === "consumed") {
          invoked.consumedComputeUnits = Number(logsProgramParts[2]);
          continue;
        }
        if (logProgramKind === "success") {
          invoked.error = undefined;
          return { logIndex };
        }
        if (logProgramKind === "failed:") {
          invoked.error = logsProgramParts.slice(2).join(" ");
          return { logIndex };
        }
      }
    }
    invoked.callStack.push({ unknown: logLine });
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
      fee: jsonDecoderNullable(jsonCodecNumber.decoder),
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
