import { Hash, Instruction } from "../types";
import { base58Decode, base58Encode } from "./Base58";
import { Pubkey } from "./Pubkey";
import { Signer } from "./Signer";

export type Message = {
  payerAddress: Pubkey;
  instructions: Array<Instruction>;
  recentBlockHash: Hash;
};

export function messageCompile(message: Message): Uint8Array {
  const metaByAddress = new Map<
    Pubkey,
    { invoked: boolean; signing: boolean; writable: boolean }
  >();
  metaByAddress.set(message.payerAddress, {
    invoked: false,
    signing: true,
    writable: true,
  });
  for (const instruction of message.instructions) {
    const programMeta = metaByAddress.get(instruction.programAddress) ?? {
      invoked: false,
      signing: false,
      writable: false,
    };
    programMeta.invoked = true;
    metaByAddress.set(instruction.programAddress, programMeta);
    for (const input of instruction.inputs) {
      const inputMeta = metaByAddress.get(input.address) ?? {
        invoked: false,
        signing: false,
        writable: false,
      };
      inputMeta.signing = inputMeta.signing || input.signing;
      inputMeta.writable = inputMeta.writable || input.writable;
      metaByAddress.set(input.address, inputMeta);
    }
  }
  const addressesWithMetas = [...metaByAddress.entries()];
  const writableSigners = addressesWithMetas.filter(
    ([, meta]) => meta.signing && meta.writable,
  );
  const readonlySigners = addressesWithMetas.filter(
    ([, meta]) => meta.signing && !meta.writable,
  );
  const writableNonSigners = addressesWithMetas.filter(
    ([, meta]) => !meta.signing && meta.writable,
  );
  const readonlyNonSigners = addressesWithMetas.filter(
    ([, meta]) => !meta.signing && !meta.writable,
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
  let length = 1 + 4 + staticAccountKeys.length * 32 + 32 + 1;
  for (const instruction of message.instructions) {
    length += 2 + instruction.inputs.length + 1 + instruction.data.length;
  }
  length += 1; // LUTs count
  // TODO - handle LUTs
  const addressesToIndexes = new Map<Pubkey, number>();
  for (let index = 0; index < staticAccountKeys.length; index++) {
    addressesToIndexes.set(staticAccountKeys[index]!, index);
  }
  let index = 0;
  const frame = new Uint8Array(length);
  frame[index++] = 0x80;
  frame[index++] = numRequiredSignatures;
  frame[index++] = numReadonlySignedAccounts;
  frame[index++] = numReadonlyUnsignedAccounts;
  frame[index++] = staticAccountKeys.length;
  for (const staticAccountKey of staticAccountKeys) {
    frame.set(base58Decode(staticAccountKey), index);
    index += 32;
  }
  frame.set(base58Decode(message.recentBlockHash), index);
  index += 32;
  frame[index++] = message.instructions.length;
  for (const instruction of message.instructions) {
    frame[index++] = addressesToIndexes.get(instruction.programAddress)!;
    frame[index++] = instruction.inputs.length;
    for (const input of instruction.inputs) {
      frame[index++] = addressesToIndexes.get(input.address)!;
    }
    frame[index++] = instruction.data.length;
    frame.set(instruction.data, index);
    index += instruction.data.length;
  }
  frame[index++] = 0; // LUTs count
  // TODO - handle LUTs
  return frame;
}

export async function messageSign(
  messageCompiled: Uint8Array,
  signers: Array<Signer>,
): Promise<Uint8Array> {
  const signerPerAddress = new Map<Pubkey, Signer>();
  for (const signer of signers) {
    signerPerAddress.set(signer.address, signer);
  }
  const compiledHeaderSize = 1 + 3 + 1;
  if (messageCompiled.length < compiledHeaderSize) {
    throw new Error(
      `Message: Expected message header (found ${messageCompiled.length} bytes)`,
    );
  }
  const numRequiredSignatures = messageCompiled[1]!;
  const staticAccountKeysLength = messageCompiled[4]!;
  if (
    messageCompiled.length <
    compiledHeaderSize + staticAccountKeysLength * 32 + 32 + 1 + 1
  ) {
    throw new Error(
      `Message: Expected valid compiled message (found ${messageCompiled.length} bytes)`,
    );
  }
  const signaturesSize = 1 + 64 * numRequiredSignatures;
  const messageSigned = new Uint8Array(signaturesSize + messageCompiled.length);
  messageSigned[0] = numRequiredSignatures;
  for (let index = 0; index < numRequiredSignatures; index++) {
    const addressIndex = compiledHeaderSize + index * 32;
    const signerAddress = base58Encode(
      messageCompiled.slice(addressIndex, addressIndex + 32),
    );
    const signer = signerPerAddress.get(signerAddress);
    if (signer === undefined) {
      throw new Error(`Message: Missing signer for address: ${signerAddress}`);
    }
    messageSigned.set(
      base58Decode(await signer.sign(messageCompiled)),
      1 + index * 64,
    );
  }
  messageSigned.set(messageCompiled, signaturesSize);
  return messageSigned;
}
