import { base58Decode } from "../data/Base58";
import { base64Decode } from "../data/Base64";
import { InstructionInput, InstructionRequest } from "../data/Instruction";
import {
  jsonCodecBlockHash,
  jsonCodecBlockSlot,
  jsonCodecNumber,
  jsonCodecPubkey,
  jsonCodecSignature,
  jsonCodecString,
  jsonDecoderArrayToArray,
  jsonDecoderByType,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
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

/**
 * Fetches a confirmed transaction by its signature handle, including its full execution details
 * and optionally a structured call-stack flow.
 *
 * @param self - The {@link RpcHttp} client to use.
 * @param transactionHandle - The {@link TransactionHandle} (transaction signature) to look up.
 * @param options - Optional fetch options.
 * @param options.skipTransactionFlow - When `true`, skips parsing the program invocation call-stack
 *   from the transaction logs, leaving `transactionFlow` as `undefined`.
 * @returns An object containing `transactionRequest` ({@link TransactionRequest}),
 *   `transactionExecution` ({@link TransactionExecution}), and `transactionFlow` ({@link TransactionFlow}),
 *   or `undefined` if the transaction is not yet found on-chain.
 */
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
  if (result === null) {
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
  const instructionsRequests = decompileInstructionsRequests(
    instructionsInputs,
    message.instructions,
  );
  const transactionRequest: TransactionRequest = {
    payerAddress: accountKeys[0]!,
    recentBlockHash: message.recentBlockhash,
    instructionsRequests,
  };
  const transactionExecution: TransactionExecution = {
    blockTime: result.blockTime ? new Date(result.blockTime * 1000) : undefined,
    blockSlot: result.slot,
    transactionLogs: meta.logMessages ?? undefined,
    transactionError: meta.err, // TODO - parse error to find custom program errors ?
    consumedComputeUnits: meta.computeUnitsConsumed,
    chargedFeesLamports: meta.fee ? BigInt(meta.fee) : undefined,
  };
  if (
    options?.skipTransactionFlow ||
    meta.innerInstructions === null ||
    meta.logMessages === null
  ) {
    return {
      transactionRequest,
      transactionExecution,
      transactionFlow: undefined,
    };
  }
  const instructionsCallStacks = decompileInstructionsCallStacks(
    instructionsRequests,
    instructionsInputs,
    meta.innerInstructions,
  );
  const rootTransactionInvocation: TransactionInvocation = {
    instructionRequest: {} as InstructionRequest,
    innerFlow: [],
    instructionError: undefined,
    instructionReturned: undefined,
    consumedComputeUnits: undefined,
  };
  const afterParsing = parseTransactionInvocations(
    rootTransactionInvocation,
    instructionsCallStacks,
    meta.logMessages,
    -1,
  );
  if (rootTransactionInvocation.instructionError !== undefined) {
    throw new Error(
      `RpcHttp: Unable to parse transaction callstack (found error at root level: ${rootTransactionInvocation.instructionError})`,
    );
  }
  if (rootTransactionInvocation.instructionReturned !== undefined) {
    throw new Error(
      `RpcHttp: Unable to parse transaction callstack (found returned data at root level: ${rootTransactionInvocation.instructionReturned})`,
    );
  }
  if (rootTransactionInvocation.consumedComputeUnits !== undefined) {
    throw new Error(
      `RpcHttp: Unable to parse transaction callstack (found consumed compute units at root level: ${rootTransactionInvocation.consumedComputeUnits})`,
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
    transactionFlow: rootTransactionInvocation.innerFlow,
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

function decompileInstructionsRequests(
  instructionsInputs: Array<InstructionInput>,
  instructionsCompiled: Array<InstructionCompiled>,
): Array<InstructionRequest> {
  const instructionsRequests = new Array<InstructionRequest>();
  for (const instructionCompiled of instructionsCompiled) {
    const stackIndex = instructionCompiled.stackHeight - 1;
    if (stackIndex !== 0) {
      throw new Error(
        `RpcHttp: Expected instruction stack index to be 0 (found ${stackIndex})`,
      );
    }
    instructionsRequests.push(
      decompileInstructionRequest(instructionCompiled, instructionsInputs),
    );
  }
  return instructionsRequests;
}

function decompileInstructionRequest(
  instructionCompiled: InstructionCompiled,
  instructionsInputs: Array<InstructionInput>,
): InstructionRequest {
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
    instructionInputs: instructionInputs,
    instructionData: base58Decode(instructionCompiled.dataBase58),
  };
}

type InstructionCallStack = {
  instructionRequest: InstructionRequest;
  callStack: Array<InstructionCallStack>;
};

function decompileInstructionsCallStacks(
  instructionsRequests: Array<InstructionRequest>,
  instructionsInputs: Array<InstructionInput>,
  compiledInnerInstructions: Array<{
    index: number;
    instructions: Array<InstructionCompiled>;
  }>,
): Array<InstructionCallStack> {
  const rootInvocations = new Array<InstructionCallStack>();
  for (let index = 0; index < instructionsRequests.length; index++) {
    rootInvocations.push({
      instructionRequest: instructionsRequests[index]!,
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
        instructionRequest: decompileInstructionRequest(
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
  let invocationIndex = 0;
  while (logIndex + 1 < logs.length) {
    logIndex++;
    const logLine = logs[logIndex]!;
    const logRegular = stripPrefix(logLine, "Program log: ");
    if (logRegular !== undefined) {
      invocation.innerFlow.push({ log: logRegular });
      continue;
    }
    const logData = stripPrefix(logLine, "Program data: ");
    if (logData !== undefined) {
      invocation.innerFlow.push({ data: base64Decode(logData) });
      continue;
    }
    const logReturn = stripPrefix(logLine, "Program return: ");
    if (logReturn !== undefined) {
      const logReturnParts = logReturn.split(" ");
      if (logReturnParts.length !== 2) {
        throw new Error(`RpcHttp: Unexpected return log: ${logLine}`);
      }
      if (
        invocation.instructionRequest.programAddress !==
        pubkeyFromBase58(logReturnParts[0]!)
      ) {
        throw new Error(
          `RpcHttp: Unexpected return log program address (expected ${invocation.instructionRequest.programAddress}, found ${logReturnParts}): ${logLine}`,
        );
      }
      invocation.instructionReturned = base64Decode(logReturnParts[1]!);
      continue;
    }
    const logProgram = stripPrefix(logLine, "Program ");
    if (logProgram !== undefined) {
      const logsProgramParts = logProgram.split(" ");
      if (logsProgramParts.length >= 2) {
        const logProgramAction = logsProgramParts[1]!;
        if (logProgramAction === "invoke") {
          const instructionCallStack = instructionsCallStacks[invocationIndex];
          if (instructionCallStack === undefined) {
            throw new Error(`RpcHttp: Unexpected program log: ${logIndex}`);
          }
          if (
            instructionCallStack.instructionRequest.programAddress !==
            pubkeyFromBase58(logsProgramParts[0]!)
          ) {
            throw new Error(
              `RpcHttp: Unexpected invoke log program address (expected ${instructionCallStack.instructionRequest.programAddress}, found ${logsProgramParts}): ${logLine}`,
            );
          }
          invocationIndex++;
          const innerInvocation: TransactionInvocation = {
            instructionRequest: instructionCallStack.instructionRequest,
            innerFlow: [],
            instructionError: undefined,
            instructionReturned: undefined,
            consumedComputeUnits: undefined,
          };
          const afterParsing = parseTransactionInvocations(
            innerInvocation,
            instructionCallStack.callStack,
            logs,
            logIndex,
          );
          logIndex = afterParsing.logIndex;
          invocation.innerFlow.push({ invocation: innerInvocation });
          continue;
        }
        if (logProgramAction === "consumed") {
          invocation.consumedComputeUnits = Number(logsProgramParts[2]);
          continue;
        }
        if (logProgramAction === "success") {
          invocation.instructionError = undefined;
          return { logIndex };
        }
        if (logProgramAction === "failed:") {
          invocation.instructionError = logsProgramParts.slice(2).join(" ");
          return { logIndex };
        }
      }
    }
    invocation.innerFlow.push({ unknown: logLine });
  }
  return { logIndex };
}

const compiledInstructionsJsonDecoder = jsonDecoderArrayToArray(
  jsonDecoderObjectToObject(
    {
      stackHeight: jsonCodecNumber.decoder,
      programIndex: jsonCodecNumber.decoder,
      accountsIndexes: jsonDecoderArrayToArray(jsonCodecNumber.decoder),
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

const resultJsonDecoder = jsonDecoderNullable(
  jsonDecoderObjectToObject({
    blockTime: jsonDecoderNullable(jsonCodecNumber.decoder),
    meta: jsonDecoderObjectToObject({
      computeUnitsConsumed: jsonCodecNumber.decoder,
      err: jsonDecoderByType<null | string | JsonObject>({
        null: () => null,
        string: (string) => string,
        object: (object) => object,
      }),
      fee: jsonDecoderNullable(jsonCodecNumber.decoder),
      innerInstructions: jsonDecoderNullable(
        jsonDecoderArrayToArray(
          jsonDecoderObjectToObject({
            index: jsonCodecNumber.decoder,
            instructions: compiledInstructionsJsonDecoder,
          }),
        ),
      ),
      loadedAddresses: jsonDecoderNullable(
        jsonDecoderObjectToObject({
          writable: jsonDecoderArrayToArray(jsonCodecPubkey.decoder),
          readonly: jsonDecoderArrayToArray(jsonCodecPubkey.decoder),
        }),
      ),
      logMessages: jsonDecoderNullable(
        jsonDecoderArrayToArray(jsonCodecString.decoder),
      ),
    }),
    slot: jsonCodecBlockSlot.decoder,
    transaction: jsonDecoderObjectToObject({
      message: jsonDecoderObjectToObject({
        accountKeys: jsonDecoderArrayToArray(jsonCodecPubkey.decoder),
        addressTableLookups: jsonDecoderNullable(
          jsonDecoderArrayToArray(
            jsonDecoderObjectToObject({
              accountKey: jsonCodecPubkey.decoder,
              readonlyIndexes: jsonDecoderArrayToArray(jsonCodecNumber.decoder),
              writableIndexes: jsonDecoderArrayToArray(jsonCodecNumber.decoder),
            }),
          ),
        ),
        header: jsonDecoderObjectToObject({
          numReadonlySignedAccounts: jsonCodecNumber.decoder,
          numReadonlyUnsignedAccounts: jsonCodecNumber.decoder,
          numRequiredSignatures: jsonCodecNumber.decoder,
        }),
        instructions: compiledInstructionsJsonDecoder,
        recentBlockhash: jsonCodecBlockHash.decoder,
      }),
      signatures: jsonDecoderArrayToArray(jsonCodecSignature.decoder),
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

function stripPrefix(s: string, prefix: string): string | undefined {
  return s.startsWith(prefix) ? s.slice(prefix.length) : undefined;
}
