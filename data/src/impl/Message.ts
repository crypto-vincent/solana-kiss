import { Blockhash, blockhashToBytes } from "./Blockhash";
import { Instruction } from "./Instruction";
import { Pubkey, pubkeyFromBytes, pubkeyToBytes } from "./Pubkey";
import { signatureToBytes } from "./Signature";
import { Signer } from "./Signer";

export type Message = {
  payerAddress: Pubkey;
  instructions: Array<Instruction>;
  recentBlockhash: Blockhash;
};

export function messageCompile(message: Message): Uint8Array {
  const propsByAddress = new Map<
    Pubkey,
    { invoked: boolean; signing: boolean; writable: boolean }
  >();
  propsByAddress.set(message.payerAddress, {
    invoked: false,
    signing: true,
    writable: true,
  });
  for (const instruction of message.instructions) {
    const programMeta = propsByAddress.get(instruction.programAddress) ?? {
      invoked: false,
      signing: false,
      writable: false,
    };
    programMeta.invoked = true;
    propsByAddress.set(instruction.programAddress, programMeta);
    for (const input of instruction.inputs) {
      const inputMeta = propsByAddress.get(input.address) ?? {
        invoked: false,
        signing: false,
        writable: false,
      };
      inputMeta.signing = inputMeta.signing || input.signing;
      inputMeta.writable = inputMeta.writable || input.writable;
      propsByAddress.set(input.address, inputMeta);
    }
  }
  const allAccounts = [...propsByAddress.entries()];
  const writableSigners = allAccounts.filter(
    ([, meta]) => meta.signing && meta.writable,
  );
  const readonlySigners = allAccounts.filter(
    ([, meta]) => meta.signing && !meta.writable,
  );
  const writableNonSigners = allAccounts.filter(
    ([, meta]) => !meta.signing && meta.writable,
  );
  const readonlyNonSigners = allAccounts.filter(
    ([, meta]) => !meta.signing && !meta.writable,
  );
  const signersCount = writableSigners.length + readonlySigners.length;
  const readonlySignersCount = readonlySigners.length;
  const readonlyNonSignersCount = readonlyNonSigners.length;
  const staticAddresses = [
    ...writableSigners.map(([address]) => address),
    ...readonlySigners.map(([address]) => address),
    ...writableNonSigners.map(([address]) => address),
    ...readonlyNonSigners.map(([address]) => address),
  ];
  let length = 1 + 3 + 1 + staticAddresses.length * 32 + 32 + 1;
  for (const instruction of message.instructions) {
    length += 1 + 1 + instruction.inputs.length + 1 + instruction.data.length;
  }
  length += 1; // LUTs count
  // TODO - handle LUTs
  const addressesToIndexes = new Map<Pubkey, number>();
  for (let index = 0; index < staticAddresses.length; index++) {
    addressesToIndexes.set(staticAddresses[index]!, index);
  }
  let index = 0;
  const frame = new Uint8Array(length);
  frame[index++] = 0x80;
  frame[index++] = signersCount;
  frame[index++] = readonlySignersCount;
  frame[index++] = readonlyNonSignersCount;
  frame[index++] = staticAddresses.length;
  for (const staticAddress of staticAddresses) {
    frame.set(pubkeyToBytes(staticAddress), index);
    index += 32;
  }
  frame.set(blockhashToBytes(message.recentBlockhash), index);
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
      `Message: Expected valid compiled message header (found ${messageCompiled.length} bytes)`,
    );
  }
  const signersCount = messageCompiled[1]!;
  if (messageCompiled.length < compiledHeaderSize + signersCount * 32) {
    throw new Error(
      `Message: Expected valid compiled message ${signersCount} signers (found ${messageCompiled.length} bytes)`,
    );
  }
  const signaturesSize = 1 + 64 * signersCount;
  const messageSigned = new Uint8Array(signaturesSize + messageCompiled.length);
  messageSigned[0] = signersCount;
  for (let signerIndex = 0; signerIndex < signersCount; signerIndex++) {
    const compiledAddressOffset = compiledHeaderSize + signerIndex * 32;
    const signerAddress = pubkeyFromBytes(
      messageCompiled.slice(compiledAddressOffset, compiledAddressOffset + 32),
    );
    const signer = signerPerAddress.get(signerAddress);
    if (signer === undefined) {
      throw new Error(`Message: Missing signer for address: ${signerAddress}`);
    }
    messageSigned.set(
      signatureToBytes(await signer.sign(messageCompiled)),
      1 + signerIndex * 64,
    );
  }
  messageSigned.set(messageCompiled, signaturesSize);
  return messageSigned;
}
