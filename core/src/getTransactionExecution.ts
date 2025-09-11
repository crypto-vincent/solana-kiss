import { base64Decode } from './base64';
import {
  Commitment,
  Execution,
  Instruction,
  PublicKey,
  Rpc,
  Signature,
} from './types';
import {
  enforceObject,
  enforceNumber,
  enforceString,
  enforceArray,
} from './utils';

export async function getTransactionExecution(
  rpc: Rpc,
  transactionId: Signature,
  context?: {
    commitment?: Commitment;
  },
): Promise<Execution> {
  const result = enforceObject(
    await rpc('getTransaction', [
      transactionId,
      {
        commitment: context?.commitment,
        encoding: 'json',
        maxSupportedTransactionVersion: 0,
      },
    ]),
  );
  // console.log('getTransactionExecution.result', result);
  const meta = enforceObject(result.meta);
  // TODO - handle errors in outcome (meta.err)?
  // TODO - handle innerInstructions (meta.innerInstructions)?
  const loadedAddresses = enforceObject(meta.loadedAddresses);
  const loadedWritableAddresses = enforceArray(loadedAddresses.writable);
  const loadedReadonlyAddresses = enforceArray(loadedAddresses.readonly);
  const logMessages = enforceArray(meta.logMessages).map(enforceString);
  const transaction = enforceObject(result.transaction);
  const message = enforceObject(transaction.message);
  const header = enforceObject(message.header);
  const accountKeys = enforceArray(message.accountKeys).map(enforceString);
  const instructions = enforceArray(message.instructions).map(enforceObject);
  return {
    transaction: {
      payerAddress: decompileTransactionPayerAddress(accountKeys),
      instructions: decompileTransactionInstructions(
        enforceNumber(header.numRequiredSignatures),
        enforceNumber(header.numReadonlySignedAccounts),
        enforceNumber(header.numReadonlyUnsignedAccounts),
        accountKeys,
        loadedWritableAddresses.map(enforceString),
        loadedReadonlyAddresses.map(enforceString),
        instructions.map((instruction) => ({
          programIndex: enforceNumber(instruction.programIdIndex),
          accountsIndexes: enforceArray(instruction.accounts).map(
            enforceNumber,
          ),
          data: enforceString(instruction.data),
        })),
      ),
      recentBlockHash: enforceString(message.recentBlockhash),
    },
    outcome: {
      error: meta.err,
      logs: logMessages,
      chargedFees: BigInt(enforceNumber(meta.fee)),
      computeUnitsConsumed: enforceNumber(meta.computeUnitsConsumed),
    },
  };
}

function decompileTransactionPayerAddress(staticAddresses: Array<PublicKey>) {
  if (staticAddresses.length === 0) {
    throw new Error('No static addresses provided');
  }
  return staticAddresses[0];
}

function decompileTransactionInstructions(
  headerNumRequiredSignatures: number,
  headerNumReadonlySignedAccounts: number,
  headerNumReadonlyUnsignedAccounts: number,
  staticAddresses: Array<PublicKey>,
  loadedWritableAddresses: Array<PublicKey>,
  loadedReadonlyAddresses: Array<PublicKey>,
  compiledInstructions: Array<{
    programIndex: number;
    accountsIndexes: Array<number>;
    data: string;
  }>,
): Array<Instruction> {
  let signerAddresses = new Set<PublicKey>();
  for (let index = 0; index < headerNumRequiredSignatures; index++) {
    signerAddresses.add(staticAddresses[index]);
  }
  let readonlyAddresses = new Set<PublicKey>();
  for (
    let readonlyIndex =
      headerNumRequiredSignatures - headerNumReadonlySignedAccounts;
    readonlyIndex < headerNumRequiredSignatures;
    readonlyIndex++
  ) {
    readonlyAddresses.add(staticAddresses[readonlyIndex]);
  }
  for (
    let readonlyIndex =
      staticAddresses.length - headerNumReadonlyUnsignedAccounts;
    readonlyIndex < staticAddresses.length;
    readonlyIndex++
  ) {
    readonlyAddresses.add(staticAddresses[readonlyIndex]);
  }
  for (let loadedReadonlyAddress of loadedReadonlyAddresses) {
    readonlyAddresses.add(loadedReadonlyAddress);
  }
  let usedAddresses = new Array<PublicKey>();
  usedAddresses.push(...staticAddresses);
  usedAddresses.push(...loadedWritableAddresses);
  usedAddresses.push(...loadedReadonlyAddresses);
  let instructions = new Array<Instruction>();
  for (let compiledInstruction of compiledInstructions) {
    let programAddress = usedAddresses[compiledInstruction.programIndex];
    if (programAddress === undefined) {
      throw new Error(
        `Invalid program ID index: ${compiledInstruction.programIndex}`,
      );
    }
    let accountsDescriptors = new Array<
      Instruction['accountsDescriptors'][0]
    >();
    for (let accountIndex of compiledInstruction.accountsIndexes) {
      let accountAddress = usedAddresses[accountIndex];
      if (accountAddress === undefined) {
        throw new Error(`Invalid account index: ${accountIndex}`);
      }
      accountsDescriptors.push({
        address: accountAddress,
        writable: !readonlyAddresses.has(accountAddress),
        signer: signerAddresses.has(accountAddress),
      });
    }
    instructions.push({
      programAddress,
      accountsDescriptors,
      data: base64Decode(compiledInstruction.data),
    });
  }
  return instructions;
}
