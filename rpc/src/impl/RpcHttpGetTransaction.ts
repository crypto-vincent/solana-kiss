import {
  Input,
  Instruction,
  Pubkey,
  Signature,
  base58Decode,
  jsonDecoderArray,
  jsonDecoderNullable,
  jsonDecoderObject,
  jsonDecoderObjectToRecord,
  jsonDecoderOptional,
  jsonTypeNumber,
  jsonTypeString,
  jsonTypeValue,
} from "solana-kiss-data";
import { RpcHttp } from "./RpcHttp";
import { Commitment, Invocation, Transaction } from "./RpcTypes";

export async function rpcHttpGetTransaction(
  rpcHttp: RpcHttp,
  transactionSignature: Signature,
  context?: {
    commitment?: Commitment;
  },
): Promise<Transaction | undefined> {
  const result = resultJsonDecoder(
    await rpcHttp("getTransaction", [
      transactionSignature,
      {
        commitment: context?.commitment,
        encoding: "json",
        maxSupportedTransactionVersion: 0,
      },
    ]),
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
  const transactionInputs = decompileTransactionInputs(
    header.numRequiredSignatures,
    header.numReadonlySignedAccounts,
    header.numReadonlyUnsignedAccounts,
    accountKeys,
    loadedAddresses.writable,
    loadedAddresses.readonly,
  );
  const transactionInstructions = decompileTransactionInstructions(
    transactionInputs,
    message.instructions,
  );
  return {
    slot: result.slot,
    message: {
      payerAddress: accountKeys[0]!,
      instructions: transactionInstructions,
      recentBlockhash: message.recentBlockhash,
    },
    error: meta.err, // TODO - parse error to find
    logs: meta.logMessages, // TODO - parse logs for invocations and event data
    chargedFees: BigInt(meta.fee),
    consumedComputeUnits: meta.computeUnitsConsumed,
    invocations: decompileTransactionInvocations(
      transactionInputs,
      transactionInstructions,
      meta.innerInstructions ?? [],
    ),
  };
}

function decompileTransactionInputs(
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
  const transactionInputs = new Array<Input>();
  for (const inputAddress of inputsAddresses) {
    transactionInputs.push({
      address: inputAddress,
      signing: signingAddresses.has(inputAddress),
      writable: !readonlyAddresses.has(inputAddress),
    });
  }
  return transactionInputs;
}

function decompileTransactionInstructions(
  transactionInputs: Array<Input>,
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
      decompileTransactionInstruction(transactionInputs, compiledInstruction),
    );
  }
  return instructions;
}

function decompileTransactionInvocations(
  transactionInputs: Array<Input>,
  transactionInstructions: Array<Instruction>,
  compiledInnerInstructions: Array<{
    index: number;
    instructions: Array<CompiledInstruction>;
  }>,
): Array<Invocation> {
  const rootInvocations = new Array<Invocation>();
  for (let index = 0; index < transactionInstructions.length; index++) {
    rootInvocations.push({
      instruction: transactionInstructions[index]!,
      invocations: [],
    });
  }
  for (const compiledInnerInstructionBlock of compiledInnerInstructions) {
    const rootInvocation = expectItemInArray(
      rootInvocations,
      compiledInnerInstructionBlock.index,
    );
    const invocationStack = new Array<Invocation>();
    invocationStack.push(rootInvocation);
    for (const compiledInnerInstruction of compiledInnerInstructionBlock.instructions) {
      const innerInvocation = {
        instruction: decompileTransactionInstruction(
          transactionInputs,
          compiledInnerInstruction,
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

type CompiledInstruction = {
  stackHeight: number;
  programIndex: number;
  accountsIndexes: Array<number>;
  dataBase58: string;
};

function decompileTransactionInstruction(
  transactionInputs: Array<Input>,
  compiledInstruction: CompiledInstruction,
): Instruction {
  const instructionProgram = expectItemInArray(
    transactionInputs,
    compiledInstruction.programIndex,
  );
  const instructionInputs = new Array<Input>();
  for (const accountIndex of compiledInstruction.accountsIndexes) {
    instructionInputs.push(expectItemInArray(transactionInputs, accountIndex));
  }
  return {
    programAddress: instructionProgram.address,
    inputs: instructionInputs,
    data: base58Decode(compiledInstruction.dataBase58),
  };
}

const instructionDecoder = jsonDecoderObject(
  {
    stackHeight: jsonTypeNumber.decoder,
    programIndex: jsonTypeNumber.decoder,
    accountsIndexes: jsonDecoderArray(jsonTypeNumber.decoder),
    dataBase58: jsonTypeString.decoder,
  },
  {
    programIndex: "programIdIndex",
    accountsIndexes: "accounts",
    dataBase58: "data",
  },
);

const resultJsonDecoder = jsonDecoderOptional(
  jsonDecoderObject({
    blockTime: jsonTypeNumber.decoder,
    meta: jsonDecoderObject({
      computeUnitsConsumed: jsonTypeNumber.decoder,
      err: jsonDecoderNullable(
        jsonDecoderObjectToRecord(jsonTypeValue.decoder),
      ),
      fee: jsonTypeNumber.decoder,
      innerInstructions: jsonDecoderOptional(
        jsonDecoderArray(
          jsonDecoderObject({
            index: jsonTypeNumber.decoder,
            instructions: jsonDecoderArray(instructionDecoder),
          }),
        ),
      ),
      loadedAddresses: jsonDecoderObject({
        writable: jsonDecoderArray(jsonTypeString.decoder),
        readonly: jsonDecoderArray(jsonTypeString.decoder),
      }),
      logMessages: jsonDecoderArray(jsonTypeString.decoder),
    }),
    slot: jsonTypeNumber.decoder,
    transaction: jsonDecoderObject({
      message: jsonDecoderObject({
        accountKeys: jsonDecoderArray(jsonTypeString.decoder),
        addressTableLookups: jsonDecoderOptional(
          jsonDecoderArray(
            jsonDecoderObject({
              accountKey: jsonTypeString.decoder,
              readonlyIndexes: jsonDecoderArray(jsonTypeNumber.decoder),
              writableIndexes: jsonDecoderArray(jsonTypeNumber.decoder),
            }),
          ),
        ),
        header: jsonDecoderObject({
          numReadonlySignedAccounts: jsonTypeNumber.decoder,
          numReadonlyUnsignedAccounts: jsonTypeNumber.decoder,
          numRequiredSignatures: jsonTypeNumber.decoder,
        }),
        instructions: jsonDecoderArray(instructionDecoder),
        recentBlockhash: jsonTypeString.decoder,
      }),
      signatures: jsonDecoderArray(jsonTypeString.decoder),
    }),
  }),
);

export function expectItemInArray<T>(array: Array<T>, index: number): T {
  if (index < 0 || index >= array.length) {
    throw new Error(
      `Array index ${index} out of bounds (length: ${array.length})`,
    );
  }
  return array[index]!;
}
