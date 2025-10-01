import { base58Decode } from "../data/Base58";
import {
  jsonTypeArray,
  jsonTypeNullable,
  jsonTypeNumber,
  jsonTypeObject,
  jsonTypeObjectToRecord,
  jsonTypeString,
  jsonTypeValue,
} from "../data/Json";
import { Pubkey } from "../data/Pubkey";
import {
  Commitment,
  Input,
  Instruction,
  Invokation,
  Signature,
  Transaction,
} from "../types";
import { expectItemInArray } from "../utils";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpGetTransaction(
  rpcHttp: RpcHttp,
  transactionKey: Signature,
  context?: {
    commitment?: Commitment;
  },
): Promise<Transaction | undefined> {
  const result = resultJsonType.decode(
    await rpcHttp("getTransaction", [
      transactionKey,
      {
        commitment: context?.commitment,
        encoding: "json",
        maxSupportedTransactionVersion: 0,
      },
    ]),
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
      recentBlockHash: message.recentBlockhash,
    },
    error: meta.err,
    logs: meta.logMessages,
    chargedFees: BigInt(meta.fee),
    computeUnitsConsumed: meta.computeUnitsConsumed,
    invokations: decompileTransactionInvokations(
      transactionInputs,
      transactionInstructions,
      meta.innerInstructions,
    ),
  };
}

function decompileTransactionInputs(
  headerNumRequiredSignatures: number,
  headerNumReadonlySignedAccounts: number,
  headerNumReadonlyUnsignedAccounts: number,
  staticAddresses: Array<Pubkey>,
  loadedWritableAddresses: Array<Pubkey>,
  loadedReadonlyAddresses: Array<Pubkey>,
) {
  const signingAddresses = new Set<Pubkey>();
  for (
    let signerIndex = 0;
    signerIndex < headerNumRequiredSignatures;
    signerIndex++
  ) {
    signingAddresses.add(expectItemInArray(staticAddresses, signerIndex));
  }
  const readonlyAddresses = new Set<Pubkey>();
  for (
    let readonlyIndex =
      headerNumRequiredSignatures - headerNumReadonlySignedAccounts;
    readonlyIndex < headerNumRequiredSignatures;
    readonlyIndex++
  ) {
    readonlyAddresses.add(expectItemInArray(staticAddresses, readonlyIndex));
  }
  for (
    let readonlyIndex =
      staticAddresses.length - headerNumReadonlyUnsignedAccounts;
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

function decompileTransactionInvokations(
  transactionInputs: Array<Input>,
  transactionInstructions: Array<Instruction>,
  compiledInnerInstructions: Array<{
    index: number;
    instructions: Array<CompiledInstruction>;
  }>,
): Array<Invokation> {
  const rootInvokations = new Array<Invokation>();
  for (let index = 0; index < transactionInstructions.length; index++) {
    rootInvokations.push({
      instruction: transactionInstructions[index]!,
      invokations: [],
    });
  }
  for (const compiledInnerInstructionBlock of compiledInnerInstructions) {
    const rootInvokation = expectItemInArray(
      rootInvokations,
      compiledInnerInstructionBlock.index,
    );
    const invokationStack = new Array<Invokation>();
    invokationStack.push(rootInvokation);
    for (const compiledInnerInstruction of compiledInnerInstructionBlock.instructions) {
      const innerInvokation = {
        instruction: decompileTransactionInstruction(
          transactionInputs,
          compiledInnerInstruction,
        ),
        invokations: [],
      };
      const stackIndex = compiledInnerInstruction.stackHeight - 1;
      if (stackIndex < 1 || stackIndex > invokationStack.length) {
        throw new Error(
          `RpcHttp: Expected inner instruction stack index to be betweem 1 and ${invokationStack.length} (found: ${stackIndex})`,
        );
      }
      if (stackIndex === invokationStack.length) {
        invokationStack[stackIndex - 1]!.invokations.push(innerInvokation);
        invokationStack.push(innerInvokation);
      } else {
        while (stackIndex < invokationStack.length) {
          invokationStack.pop();
        }
        invokationStack[stackIndex - 1]!.invokations.push(innerInvokation);
      }
    }
  }
  return rootInvokations;
}

type CompiledInstruction = {
  stackHeight: number;
  programIndex: number;
  accountsIndexes: Array<number>;
  data: string;
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
    data: base58Decode(compiledInstruction.data),
  };
}

const instructionJsonType = jsonTypeObject(
  {
    stackHeight: jsonTypeNumber(),
    programIndex: jsonTypeNumber(),
    accountsIndexes: jsonTypeArray(jsonTypeNumber()),
    data: jsonTypeString(),
  },
  {
    programIndex: "programIdIndex",
    accountsIndexes: "accounts",
  },
);

const resultJsonType = jsonTypeNullable(
  jsonTypeObject({
    blockTime: jsonTypeNumber(),
    meta: jsonTypeObject({
      computeUnitsConsumed: jsonTypeNumber(),
      err: jsonTypeNullable(jsonTypeObjectToRecord(jsonTypeValue())),
      fee: jsonTypeNumber(),
      innerInstructions: jsonTypeArray(
        jsonTypeObject({
          index: jsonTypeNumber(),
          instructions: jsonTypeArray(instructionJsonType),
        }),
      ),
      loadedAddresses: jsonTypeObject({
        writable: jsonTypeArray(jsonTypeString()),
        readonly: jsonTypeArray(jsonTypeString()),
      }),
      logMessages: jsonTypeArray(jsonTypeString()),
    }),
    slot: jsonTypeNumber(),
    transaction: jsonTypeObject({
      message: jsonTypeObject({
        accountKeys: jsonTypeArray(jsonTypeString()),
        addressTableLookups: jsonTypeArray(
          jsonTypeObject({
            accountKey: jsonTypeString(),
            readonlyIndexes: jsonTypeArray(jsonTypeNumber()),
            writableIndexes: jsonTypeArray(jsonTypeNumber()),
          }),
        ),
        header: jsonTypeObject({
          numReadonlySignedAccounts: jsonTypeNumber(),
          numReadonlyUnsignedAccounts: jsonTypeNumber(),
          numRequiredSignatures: jsonTypeNumber(),
        }),
        instructions: jsonTypeArray(instructionJsonType),
        recentBlockhash: jsonTypeString(),
      }),
      signatures: jsonTypeArray(jsonTypeString()),
    }),
  }),
);
