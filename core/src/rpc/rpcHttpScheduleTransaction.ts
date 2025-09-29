import { base58Decode } from "../data/base58";
import { jsonTypeObject, jsonTypeString } from "../data/json";
import { Pubkey } from "../data/pubkey";
import { Commitment, Message, Signature } from "../types";
import { RpcHttp } from "./rpcHttp";

import { generateKeyPairSync } from "crypto";

const dudu = generateKeyPairSync("ed25519");

export async function rpcHttpScheduleTransaction(
  rpcHttp: RpcHttp,
  message: Message,
  signers: Array<KeyPair>,
  context?: {
    commitment?: Commitment;
  },
): Promise<Signature> {
  const compiledUnsigned = compileMessage(message);

  const dudu;
  // TODO - sign transaction

  const result = sendResultJsonType.decode(
    await rpcHttp("sendTransaction", [
      [], // TODO - compile transaciton
      {
        commitment: context?.commitment,
      },
    ]),
  );
}

const sendResultJsonType = jsonTypeObject({
  signature: jsonTypeString(),
});

function compileMessage(message: Message) {
  const addressToMeta = new Map<
    Pubkey,
    { signer: boolean; writable: boolean; invoked: boolean }
  >();
  addressToMeta.set(message.payerAddress, {
    signer: true,
    writable: true,
    invoked: false,
  });
  for (const instruction of message.instructions) {
    const programMeta = addressToMeta.get(instruction.programAddress) ?? {
      signer: false,
      writable: false,
      invoked: false,
    };
    programMeta.invoked = true;
    addressToMeta.set(instruction.programAddress, programMeta);
    for (const input of instruction.inputs) {
      const inputMeta = addressToMeta.get(input.address) ?? {
        signer: false,
        writable: false,
        invoked: false,
      };
      inputMeta.signer = inputMeta.signer || input.signer;
      inputMeta.writable = inputMeta.writable || input.writable;
      addressToMeta.set(input.address, inputMeta);
    }
  }

  const addressesWithMeta = [...addressToMeta.entries()];
  const writableSigners = addressesWithMeta.filter(
    ([, meta]) => meta.signer && meta.writable,
  );
  const readonlySigners = addressesWithMeta.filter(
    ([, meta]) => meta.signer && !meta.writable,
  );
  const writableNonSigners = addressesWithMeta.filter(
    ([, meta]) => !meta.signer && meta.writable,
  );
  const readonlyNonSigners = addressesWithMeta.filter(
    ([, meta]) => !meta.signer && !meta.writable,
  );

  const numRequiredSignatures = writableSigners.length + readonlySigners.length;
  const numReadonlySignedAccounts = readonlySigners.length;
  const numReadonlyUnsignedAccounts = readonlyNonSigners.length;

  const staticAccountKeys = [
    ...writableSigners.map(([address]) => address),
    ...readonlySigners.map(([address]) => address),
    ...writableNonSigners.map(([address]) => address),
    ...readonlyNonSigners.map(([address]) => address),
  ];

  const addressesToIndexes = new Map<Pubkey, number>();
  for (let index = 0; index < staticAccountKeys.length; index++) {
    addressesToIndexes.set(staticAccountKeys[index]!, index);
  }

  let length = 1 + 4 + staticAccountKeys.length * 32 + 32 + 1;
  for (const instruction of message.instructions) {
    length += 2 + instruction.inputs.length + 1 + instruction.data.length;
  }
  length += 1; // LUTs count

  let index = 0;
  const bytes = new Uint8Array(length);
  bytes[index++] = 0x80;
  bytes[index++] = numRequiredSignatures;
  bytes[index++] = numReadonlySignedAccounts;
  bytes[index++] = numReadonlyUnsignedAccounts;
  bytes[index++] = staticAccountKeys.length;
  for (const staticAccountKey of staticAccountKeys) {
    bytes.set(base58Decode(staticAccountKey), index);
    index += 32;
  }
  bytes.set(base58Decode(message.recentBlockHash), index);
  index += 32;

  bytes[index++] = message.instructions.length;
  for (const instruction of message.instructions) {
    bytes[index++] = addressesToIndexes.get(instruction.programAddress)!;
    bytes[index++] = instruction.inputs.length;
    for (const input of instruction.inputs) {
      bytes[index++] = addressesToIndexes.get(input.address)!;
    }
    bytes[index++] = instruction.data.length;
    bytes.set(instruction.data, index);
    index += instruction.data.length;
  }

  bytes[index++] = 0; // LUTs count
  // TODO - handle LUTs

  return bytes;
}
