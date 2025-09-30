import { base58Decode } from "../data/base58";
import { jsonTypeObject, jsonTypeString } from "../data/json";
import { Pubkey } from "../data/pubkey";
import { Signer } from "../data/signer";
import { Commitment, Message, Signature } from "../types";
import { RpcHttp } from "./rpcHttp";

export async function rpcHttpScheduleTransaction(
  rpcHttp: RpcHttp,
  message: Message,
  signers: Array<Signer>,
  context?: {
    commitment?: Commitment;
  },
): Promise<Signature> {
  const compiled = compileMessage(message, signers);

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

// TODO - export and naming
export async function compileMessage(message: Message, signers: Array<Signer>) {
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
      inputMeta.signer = inputMeta.signer || input.signing;
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
  const unsigned = new Uint8Array(length);
  unsigned[index++] = 0x80;
  unsigned[index++] = numRequiredSignatures;
  unsigned[index++] = numReadonlySignedAccounts;
  unsigned[index++] = numReadonlyUnsignedAccounts;
  unsigned[index++] = staticAccountKeys.length;
  for (const staticAccountKey of staticAccountKeys) {
    unsigned.set(base58Decode(staticAccountKey), index);
    index += 32;
  }
  unsigned.set(base58Decode(message.recentBlockHash), index);
  index += 32;

  unsigned[index++] = message.instructions.length;
  for (const instruction of message.instructions) {
    unsigned[index++] = addressesToIndexes.get(instruction.programAddress)!;
    unsigned[index++] = instruction.inputs.length;
    for (const input of instruction.inputs) {
      unsigned[index++] = addressesToIndexes.get(input.address)!;
    }
    unsigned[index++] = instruction.data.length;
    unsigned.set(instruction.data, index);
    index += instruction.data.length;
  }

  unsigned[index++] = 0; // LUTs count
  // TODO - handle LUTs

  const signerPerAddress = new Map<Pubkey, Signer>();
  for (const signer of signers) {
    signerPerAddress.set(signer.address, signer);
  }

  const signed = new Uint8Array(
    1 + 64 * numRequiredSignatures + unsigned.length,
  );
  signed[0] = numRequiredSignatures;

  for (let index = 0; index < numRequiredSignatures; index++) {
    const signerAddress = staticAccountKeys[index]!;
    const signer = signerPerAddress.get(signerAddress);
    if (signer === undefined) {
      throw new Error(`Missing signer for address: ${signerAddress}`);
    }
    const signature = await signer.sign(unsigned);
    console.log("signature");
    signed.set(base58Decode(signature), 1 + index * 64);
  }

  return signed;
}
