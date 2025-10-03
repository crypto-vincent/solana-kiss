import { base58Decode } from "../data/Base58";
import {
  jsonDecoderArray,
  jsonDecoderNullable,
  jsonDecoderObject,
  jsonDecoderObjectToRecord,
  jsonDecodeValue,
  jsonExpectNumber,
  jsonExpectString,
} from "../data/Json";
import {
  Commitment,
  Input,
  Instruction,
  Invokation,
  Signature,
  Transaction,
} from "../data/Onchain";
import { Pubkey } from "../data/Pubkey";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpGetTransaction(
  rpcHttp: RpcHttp,
  transactionKey: Signature,
  context?: {
    commitment?: Commitment;
  },
): Promise<Transaction | undefined> {
  const result = resultDecode(
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
    error: meta.err, // TODO - parse error to find
    logs: meta.logMessages, // TODO - parse logs for invokations and event data
    chargedFees: BigInt(meta.fee),
    consumedComputeUnits: meta.computeUnitsConsumed,
    invokations: decompileTransactionInvokations(
      transactionInputs,
      transactionInstructions,
      meta.innerInstructions,
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

const instructionDecode = jsonDecoderObject(
  {
    stackHeight: jsonExpectNumber,
    programIndex: jsonExpectNumber,
    accountsIndexes: jsonDecoderArray(jsonExpectNumber),
    dataBase58: jsonExpectString,
  },
  {
    programIndex: "programIdIndex",
    accountsIndexes: "accounts",
    dataBase58: "data",
  },
);

const resultDecode = jsonDecoderNullable(
  jsonDecoderObject({
    blockTime: jsonExpectNumber,
    meta: jsonDecoderObject({
      computeUnitsConsumed: jsonExpectNumber,
      err: jsonDecoderNullable(jsonDecoderObjectToRecord(jsonDecodeValue)),
      fee: jsonExpectNumber,
      innerInstructions: jsonDecoderArray(
        jsonDecoderObject({
          index: jsonExpectNumber,
          instructions: jsonDecoderArray(instructionDecode),
        }),
      ),
      loadedAddresses: jsonDecoderObject({
        writable: jsonDecoderArray(jsonExpectString),
        readonly: jsonDecoderArray(jsonExpectString),
      }),
      logMessages: jsonDecoderArray(jsonExpectString),
    }),
    slot: jsonExpectNumber,
    transaction: jsonDecoderObject({
      message: jsonDecoderObject({
        accountKeys: jsonDecoderArray(jsonExpectString),
        addressTableLookups: jsonDecoderArray(
          jsonDecoderObject({
            accountKey: jsonExpectString,
            readonlyIndexes: jsonDecoderArray(jsonExpectNumber),
            writableIndexes: jsonDecoderArray(jsonExpectNumber),
          }),
        ),
        header: jsonDecoderObject({
          numReadonlySignedAccounts: jsonExpectNumber,
          numReadonlyUnsignedAccounts: jsonExpectNumber,
          numRequiredSignatures: jsonExpectNumber,
        }),
        instructions: jsonDecoderArray(instructionDecode),
        recentBlockhash: jsonExpectString,
      }),
      signatures: jsonDecoderArray(jsonExpectString),
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
