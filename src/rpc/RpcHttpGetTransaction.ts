import { base58Decode } from "../data/Base58";
import {
  Instruction,
  InstructionInput,
  compiledInstructionsJsonDecoder,
  innerInstructionsJsonDecoder,
} from "../data/Instruction";
import {
  jsonDecoderArray,
  jsonDecoderNullable,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonTypeBlockHash,
  jsonTypeBlockSlot,
  jsonTypeNumber,
  jsonTypePubkey,
  jsonTypeSignature,
  jsonTypeValue,
} from "../data/Json";
import { Pubkey } from "../data/Pubkey";
import { Signature, signatureToBase58 } from "../data/Signature";
import {
  Transaction,
  TransactionInvocation,
  transactionLoadedAddressesJsonDecoder,
  transactionLogsMessagesJsonDecoder,
} from "../data/Transaction";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpGetTransaction(
  rpcHttp: RpcHttp,
  transactionSignature: Signature,
): Promise<Transaction | undefined> {
  const result = resultJsonDecoder(
    await rpcHttp("getTransaction", [signatureToBase58(transactionSignature)], {
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
  const transactionInputs = decompileTransactionInputs(
    header.numRequiredSignatures,
    header.numReadonlySignedAccounts,
    header.numReadonlyUnsignedAccounts,
    accountKeys,
    loadedAddresses?.writable ?? [],
    loadedAddresses?.readonly ?? [],
  );
  const transactionInstructions = decompileTransactionInstructions(
    transactionInputs,
    message.instructions,
  );
  return {
    block: {
      time: result.blockTime ? new Date(result.blockTime * 1000) : undefined,
      slot: result.slot,
    },
    message: {
      payerAddress: accountKeys[0]!,
      instructions: transactionInstructions,
      recentBlockHash: message.recentBlockhash,
    },
    error: meta.err, // TODO - parse error to find custom program errors ?
    logs: meta.logMessages, // TODO - parse logs for invocations and event data
    chargedFeesLamports: BigInt(meta.fee),
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
  const transactionInputs = new Array<InstructionInput>();
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
  transactionInputs: Array<InstructionInput>,
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
  transactionInputs: Array<InstructionInput>,
  transactionInstructions: Array<Instruction>,
  compiledInnerInstructions: Array<{
    index: number;
    instructions: Array<CompiledInstruction>;
  }>,
): Array<TransactionInvocation> {
  const rootInvocations = new Array<TransactionInvocation>();
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
    const invocationStack = new Array<TransactionInvocation>();
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
  transactionInputs: Array<InstructionInput>,
  compiledInstruction: CompiledInstruction,
): Instruction {
  const instructionProgram = expectItemInArray(
    transactionInputs,
    compiledInstruction.programIndex,
  );
  const instructionInputs = new Array<InstructionInput>();
  for (const accountIndex of compiledInstruction.accountsIndexes) {
    instructionInputs.push(expectItemInArray(transactionInputs, accountIndex));
  }
  return {
    programAddress: instructionProgram.address,
    inputs: instructionInputs,
    data: base58Decode(compiledInstruction.dataBase58),
  };
}

const resultJsonDecoder = jsonDecoderOptional(
  jsonDecoderObject((key) => key, {
    blockTime: jsonDecoderOptional(jsonTypeNumber.decoder),
    meta: jsonDecoderObject((key) => key, {
      computeUnitsConsumed: jsonTypeNumber.decoder,
      err: jsonDecoderNullable(jsonTypeValue.decoder),
      fee: jsonTypeNumber.decoder,
      innerInstructions: innerInstructionsJsonDecoder,
      loadedAddresses: transactionLoadedAddressesJsonDecoder,
      logMessages: transactionLogsMessagesJsonDecoder,
    }),
    slot: jsonTypeBlockSlot.decoder,
    transaction: jsonDecoderObject((key) => key, {
      message: jsonDecoderObject((key) => key, {
        accountKeys: jsonDecoderArray(jsonTypePubkey.decoder),
        addressTableLookups: jsonDecoderOptional(
          jsonDecoderArray(
            jsonDecoderObject((key) => key, {
              accountKey: jsonTypePubkey.decoder,
              readonlyIndexes: jsonDecoderArray(jsonTypeNumber.decoder),
              writableIndexes: jsonDecoderArray(jsonTypeNumber.decoder),
            }),
          ),
        ),
        header: jsonDecoderObject((key) => key, {
          numReadonlySignedAccounts: jsonTypeNumber.decoder,
          numReadonlyUnsignedAccounts: jsonTypeNumber.decoder,
          numRequiredSignatures: jsonTypeNumber.decoder,
        }),
        instructions: compiledInstructionsJsonDecoder,
        recentBlockhash: jsonTypeBlockHash.decoder,
      }),
      signatures: jsonDecoderArray(jsonTypeSignature.decoder),
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
