import {
  jsonExpectArrayFromObject,
  jsonExpectNumber,
  jsonExpectNumberFromObject,
  jsonExpectObject,
  jsonExpectObjectFromObject,
  jsonExpectString,
  jsonExpectStringFromArray,
  jsonExpectStringFromObject,
} from "./json";
import { base58Decode } from "./math/base58";
import { RpcHttp } from "./rpc";
import {
  Commitment,
  Execution,
  Instruction,
  PublicKey,
  Signature,
} from "./types";

export async function getTransactionExecution(
  rpcHttp: RpcHttp,
  transactionId: Signature,
  context?: {
    commitment?: Commitment;
  },
): Promise<Execution> {
  const result = jsonExpectObject(
    await rpcHttp("getTransaction", [
      transactionId,
      {
        commitment: context?.commitment,
        encoding: "json",
        maxSupportedTransactionVersion: 0,
      },
    ]),
  );
  const meta = jsonExpectObjectFromObject(result, "meta");
  // TODO - handle errors in outcome (meta.err)?
  const loadedAddresses = jsonExpectObjectFromObject(meta, "loadedAddresses");
  const loadedWritableAddresses = jsonExpectArrayFromObject(
    loadedAddresses,
    "writable",
  );
  const loadedReadonlyAddresses = jsonExpectArrayFromObject(
    loadedAddresses,
    "readonly",
  );
  const logMessages = jsonExpectArrayFromObject(meta, "logMessages").map(
    jsonExpectString,
  );
  const transaction = jsonExpectObjectFromObject(result, "transaction");
  const message = jsonExpectObjectFromObject(transaction, "message");
  const header = jsonExpectObjectFromObject(message, "header");
  const accountKeys = jsonExpectArrayFromObject(message, "accountKeys").map(
    jsonExpectString,
  );
  const instructions = jsonExpectArrayFromObject(message, "instructions").map(
    jsonExpectObject,
  );
  return {
    transaction: {
      payerAddress: jsonExpectStringFromArray(accountKeys, 0),
      instructions: decompileTransactionInstructions(
        jsonExpectNumberFromObject(header, "numRequiredSignatures"),
        jsonExpectNumberFromObject(header, "numReadonlySignedAccounts"),
        jsonExpectNumberFromObject(header, "numReadonlyUnsignedAccounts"),
        accountKeys,
        loadedWritableAddresses.map(jsonExpectString),
        loadedReadonlyAddresses.map(jsonExpectString),
        instructions.map((instruction) => ({
          programIndex: jsonExpectNumberFromObject(
            instruction,
            "programIdIndex",
          ),
          accountsIndexes: jsonExpectArrayFromObject(
            instruction,
            "accounts",
          ).map(jsonExpectNumber),
          data: jsonExpectStringFromObject(instruction, "data"),
        })),
      ),
      recentBlockHash: jsonExpectStringFromObject(message, "recentBlockhash"),
    },
    outcome: {
      error: jsonExpectObjectFromObject(meta, "err"),
      logs: logMessages,
      chargedFees: String(jsonExpectNumberFromObject(meta, "fee")),
      computeUnitsConsumed: jsonExpectNumberFromObject(
        meta,
        "computeUnitsConsumed",
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
