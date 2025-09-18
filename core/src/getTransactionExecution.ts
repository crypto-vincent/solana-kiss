import { base58Decode } from './base58';
import {
  Commitment,
  Execution,
  Instruction,
  PublicKey,
  RpcHttp,
  Signature,
} from './types';
import {
  expectJsonObject,
  expectJsonNumber,
  expectJsonString,
  expectJsonObjectFromObject,
  expectJsonArrayFromObject,
  expectJsonStringFromArray,
  expectJsonNumberFromObject,
  expectJsonStringFromObject,
} from './json';

export async function getTransactionExecution(
  rpcHttp: RpcHttp,
  transactionId: Signature,
  context?: {
    commitment?: Commitment;
  },
): Promise<Execution> {
  const result = expectJsonObject(
    await rpcHttp('getTransaction', [
      transactionId,
      {
        commitment: context?.commitment,
        encoding: 'json',
        maxSupportedTransactionVersion: 0,
      },
    ]),
  );
  // console.log('getTransactionExecution.result', result);
  const meta = expectJsonObjectFromObject(result, 'meta');
  // TODO - handle errors in outcome (meta.err)?
  const loadedAddresses = expectJsonObjectFromObject(meta, 'loadedAddresses');
  const loadedWritableAddresses = expectJsonArrayFromObject(
    loadedAddresses,
    'writable',
  );
  const loadedReadonlyAddresses = expectJsonArrayFromObject(
    loadedAddresses,
    'readonly',
  );
  const logMessages = expectJsonArrayFromObject(meta, 'logMessages').map(
    expectJsonString,
  );
  const transaction = expectJsonObjectFromObject(result, 'transaction');
  const message = expectJsonObjectFromObject(transaction, 'message');
  const header = expectJsonObjectFromObject(message, 'header');
  const accountKeys = expectJsonArrayFromObject(message, 'accountKeys').map(
    expectJsonString,
  );
  const instructions = expectJsonArrayFromObject(message, 'instructions').map(
    expectJsonObject,
  );
  return {
    transaction: {
      payerAddress: expectJsonStringFromArray(accountKeys, 0),
      instructions: decompileTransactionInstructions(
        expectJsonNumberFromObject(header, 'numRequiredSignatures'),
        expectJsonNumberFromObject(header, 'numReadonlySignedAccounts'),
        expectJsonNumberFromObject(header, 'numReadonlyUnsignedAccounts'),
        accountKeys,
        loadedWritableAddresses.map(expectJsonString),
        loadedReadonlyAddresses.map(expectJsonString),
        instructions.map((instruction) => ({
          programIndex: expectJsonNumberFromObject(
            instruction,
            'programIdIndex',
          ),
          accountsIndexes: expectJsonArrayFromObject(
            instruction,
            'accounts',
          ).map(expectJsonNumber),
          data: expectJsonStringFromObject(instruction, 'data'),
        })),
      ),
      recentBlockHash: expectJsonStringFromObject(message, 'recentBlockhash'),
    },
    outcome: {
      error: expectJsonObjectFromObject(meta, 'err'),
      logs: logMessages,
      chargedFees: String(expectJsonNumberFromObject(meta, 'fee')),
      computeUnitsConsumed: expectJsonNumberFromObject(
        meta,
        'computeUnitsConsumed',
      ),
    },
  };
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
    signerAddresses.add(expectAddressAtIndex(staticAddresses, index));
  }
  let readonlyAddresses = new Set<PublicKey>();
  for (
    let readonlyIndex =
      headerNumRequiredSignatures - headerNumReadonlySignedAccounts;
    readonlyIndex < headerNumRequiredSignatures;
    readonlyIndex++
  ) {
    readonlyAddresses.add(expectAddressAtIndex(staticAddresses, readonlyIndex));
  }
  for (
    let readonlyIndex =
      staticAddresses.length - headerNumReadonlyUnsignedAccounts;
    readonlyIndex < staticAddresses.length;
    readonlyIndex++
  ) {
    readonlyAddresses.add(expectAddressAtIndex(staticAddresses, readonlyIndex));
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
    let programAddress = expectAddressAtIndex(
      usedAddresses,
      compiledInstruction.programIndex,
    );
    let accountsDescriptors = new Array();
    for (let accountIndex of compiledInstruction.accountsIndexes) {
      let accountAddress = expectAddressAtIndex(usedAddresses, accountIndex);
      accountsDescriptors.push({
        address: accountAddress,
        writable: !readonlyAddresses.has(accountAddress),
        signer: signerAddresses.has(accountAddress),
      });
    }
    instructions.push({
      programAddress,
      accountsDescriptors,
      data: base58Decode(compiledInstruction.data),
    });
  }
  return instructions;
}

function expectAddressAtIndex(
  addresses: Array<PublicKey>,
  index: number,
): PublicKey {
  if (index < 0 || index >= addresses.length) {
    throw new Error(
      `Address index ${index} out of bounds (length: ${addresses.length})`,
    );
  }
  return addresses[index]!;
}
