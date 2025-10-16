import { BlockHash, blockHashToBytes } from "./Block";
import { Instruction } from "./Instruction";
import { Pubkey, pubkeyFromBytes, pubkeyToBytes } from "./Pubkey";
import { signatureToBytes } from "./Signature";
import { Signer } from "./Signer";

// TODO (naming) - have a branded type for a compiled message and/or decompiling utilities ?
export type Message = {
  payerAddress: Pubkey;
  recentBlockHash: BlockHash;
  instructions: Array<Instruction>;
};

// TODO - handle decompiler and legacy support ?
export function messageCompile(message: Message): Uint8Array {
  const {
    writableSigners,
    readonlySigners,
    writableNonSigners,
    readonlyNonSigners,
  } = messageAddressesMetasByCategory(message);
  const signersCount = writableSigners.length + readonlySigners.length;
  const readonlySignersCount = readonlySigners.length;
  const readonlyNonSignersCount = readonlyNonSigners.length;
  // TODO (ALT) - handle LUTs
  const staticAddresses = [
    ...writableSigners.map(([address]) => address),
    ...readonlySigners.map(([address]) => address),
    ...writableNonSigners.map(([address]) => address),
    ...readonlyNonSigners.map(([address]) => address),
  ];
  const staticIndexByAddress = new Map<Pubkey, number>();
  for (let index = 0; index < staticAddresses.length; index++) {
    staticIndexByAddress.set(staticAddresses[index]!, index);
  }
  const bytes = new Array<number>();
  bytes.push(0x80); // TODO (ALT) - handle versioning
  bytes.push(signersCount);
  bytes.push(readonlySignersCount);
  bytes.push(readonlyNonSignersCount);
  bytesPushShortVec16(bytes, staticAddresses.length);
  for (const staticAddress of staticAddresses) {
    const staticAddressBytes = pubkeyToBytes(staticAddress);
    for (const byte of staticAddressBytes) {
      bytes.push(byte);
    }
  }
  const recentBlockHashBytes = blockHashToBytes(message.recentBlockHash);
  for (const byte of recentBlockHashBytes) {
    bytes.push(byte);
  }
  bytesPushShortVec16(bytes, message.instructions.length);
  for (const instruction of message.instructions) {
    const programIndex = staticIndexByAddress.get(instruction.programAddress);
    if (programIndex === undefined) {
      throw new Error(
        `Message: Could not find program address in static addresses: ${instruction.programAddress}`,
      );
    }
    bytes.push(programIndex);
    bytesPushShortVec16(bytes, instruction.inputs.length);
    for (const input of instruction.inputs) {
      const inputIndex = staticIndexByAddress.get(input.address);
      if (inputIndex === undefined) {
        throw new Error(
          `Message: Could not find input address in static addresses: ${input.address}`,
        );
      }
      bytes.push(inputIndex);
    }
    bytesPushShortVec16(bytes, instruction.data.length);
    for (const byte of instruction.data) {
      bytes.push(byte);
    }
  }
  // TODO (ALT) - handle address lookup tables
  bytes.push(0);
  return new Uint8Array(bytes);
}

export async function messageSign(
  messageCompiled: Uint8Array,
  signers: Array<Signer>,
  options?: {
    fillMissingSigners?: boolean;
  },
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
    const compiledSignatureOffset = 1 + signerIndex * 64;
    const signer = signerPerAddress.get(signerAddress);
    if (signer === undefined) {
      if (options?.fillMissingSigners) {
        messageSigned.fill(
          0,
          compiledSignatureOffset,
          compiledSignatureOffset + 64,
        );
      } else {
        throw new Error(
          `Message: Missing signer for address: ${signerAddress}`,
        );
      }
    } else {
      messageSigned.set(
        signatureToBytes(await signer.sign(messageCompiled)),
        compiledSignatureOffset,
      );
    }
  }
  messageSigned.set(messageCompiled, signaturesSize);
  return messageSigned;
}

function bytesPushShortVec16(bytes: Array<number>, length: number) {
  if (length < 0) {
    throw new Error(`ShortVec: Expected length to be >= 0 (found: ${length})`);
  }
  if (length < 128) {
    bytes.push(length);
    return;
  }
  bytes.push((length & 0x7f) | 0x80);
  bytes.push(length >> 7);
}

function messageAddressesMetasByCategory(message: Message) {
  const metaByAddress = new Map<
    Pubkey,
    {
      invoked: boolean;
      signing: boolean;
      writable: boolean;
    }
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
  const addressesWithMeta = [...metaByAddress.entries()];
  const writableSigners = addressesWithMeta.filter(
    ([, meta]) => meta.signing && meta.writable,
  );
  const readonlySigners = addressesWithMeta.filter(
    ([, meta]) => meta.signing && !meta.writable,
  );
  const writableNonSigners = addressesWithMeta.filter(
    ([, meta]) => !meta.signing && meta.writable,
  );
  const readonlyNonSigners = addressesWithMeta.filter(
    ([, meta]) => !meta.signing && !meta.writable,
  );
  return {
    writableSigners,
    readonlySigners,
    writableNonSigners,
    readonlyNonSigners,
  };
}
