import { BlockHash, blockHashToBytes } from "./Block";
import { Instruction } from "./Instruction";
import {
  Pubkey,
  pubkeyFromBytes,
  pubkeyToBase58,
  pubkeyToBytes,
} from "./Pubkey";
import { Signature, signatureToBytes } from "./Signature";
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
  } = messageAddressesMetasByCategory(message, { legacySorting: true });
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
  // bytes.push(0x80); // TODO (ALT) - handle versioning
  bytes.push(writableSigners.length + readonlySigners.length);
  bytes.push(readonlySigners.length);
  bytes.push(readonlyNonSigners.length);
  bytes.push(staticAddresses.length);
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
  messageBytesPushShortVec16(bytes, message.instructions.length);
  for (const instruction of message.instructions) {
    const programIndex = staticIndexByAddress.get(instruction.programAddress);
    if (programIndex === undefined) {
      throw new Error(
        `Message: Could not find program address in static addresses: ${instruction.programAddress}`,
      );
    }
    bytes.push(programIndex);
    bytes.push(instruction.inputs.length);
    for (const input of instruction.inputs) {
      const inputIndex = staticIndexByAddress.get(input.address);
      if (inputIndex === undefined) {
        throw new Error(
          `Message: Could not find input address in static addresses: ${input.address}`,
        );
      }
      bytes.push(inputIndex);
    }
    messageBytesPushShortVec16(bytes, instruction.data.length);
    for (const byte of instruction.data) {
      bytes.push(byte);
    }
  }
  // TODO (ALT) - handle address lookup tables
  // bytes.push(0);
  return new Uint8Array(bytes);
}

export function messageDecompileHeader(messageCompiled: Uint8Array) {
  if (messageCompiled.length === 0) {
    throw new Error(
      "Message: Cannot get metadata of an empty compiled message",
    );
  }
  let version = "legacy";
  let startOffset = 0;
  const firstByte = messageCompiled[0]!;
  if ((firstByte & 0b10000000) !== 0) {
    version = (firstByte & 0b01111111).toString();
    startOffset = 1;
  }
  const headerLength = startOffset + 4;
  if (messageCompiled.length < headerLength) {
    throw new Error(
      `Message: Expected valid compiled message with at least ${headerLength} bytes (found ${messageCompiled.length} bytes)`,
    );
  }
  return {
    version,
    headerLength,
    numRequiredSignatures: messageCompiled[startOffset + 0]!,
    numReadonlySignedAccounts: messageCompiled[startOffset + 1]!,
    numReadonlyUnsignedAccounts: messageCompiled[startOffset + 2]!,
    staticAccountCount: messageCompiled[startOffset + 3]!,
  };
}

export function messageSignedWithSignatures(
  messageCompiled: Uint8Array,
  signaturesBySignerAddress: Map<Pubkey, Signature>,
  options?: { ignoreMissingSignatures?: boolean },
): Uint8Array {
  const messageHeader = messageDecompileHeader(messageCompiled);
  if (
    messageCompiled.length <
    messageHeader.headerLength + messageHeader.numRequiredSignatures * 32
  ) {
    throw new Error(
      `Message: Expected valid compiled message with at least ${messageHeader.numRequiredSignatures} accounts (found ${messageCompiled.length} bytes)`,
    );
  }
  const messageSignaturesLength = 1 + 64 * messageHeader.numRequiredSignatures;
  const messageSignedLength = messageSignaturesLength + messageCompiled.length;
  if (messageSignedLength > 1232) {
    throw new Error(
      `Message: Signed message is too large: ${messageSignedLength} bytes (max: 1232 bytes)`,
    );
  }
  const messageSigned = new Uint8Array(messageSignedLength);
  messageSigned[0] = messageHeader.numRequiredSignatures;
  for (
    let signerIndex = 0;
    signerIndex < messageHeader.numRequiredSignatures;
    signerIndex++
  ) {
    const signerAddressOffset = messageHeader.headerLength + signerIndex * 32;
    const signerAddress = pubkeyFromBytes(
      messageCompiled.slice(signerAddressOffset, signerAddressOffset + 32),
    );
    const signatureOffset = 1 + signerIndex * 64;
    const signature = signaturesBySignerAddress.get(signerAddress);
    if (signature === undefined) {
      if (!options?.ignoreMissingSignatures) {
        throw new Error(
          `Message: Missing signature for signer address: ${signerAddress}`,
        );
      }
    } else {
      messageSigned.set(signatureToBytes(signature), signatureOffset);
    }
  }
  messageSigned.set(messageCompiled, messageSignaturesLength);
  return messageSigned;
}

export async function messageSignedBySigners(
  messageCompiled: Uint8Array,
  signers: Array<Signer>,
  options?: { ignoreMissingSignatures?: boolean },
): Promise<Uint8Array> {
  const signaturesBySignerAddress = new Map<Pubkey, Signature>();
  for (const signer of signers) {
    signaturesBySignerAddress.set(
      signer.address,
      await signer.sign(messageCompiled),
    );
  }
  return messageSignedWithSignatures(
    messageCompiled,
    signaturesBySignerAddress,
    options,
  );
}

function messageBytesPushShortVec16(bytes: Array<number>, length: number) {
  if (length < 0) {
    throw new Error(`Message: Expected length to be >= 0 (found: ${length})`);
  }
  if (length < 128) {
    bytes.push(length);
    return;
  }
  bytes.push((length & 0x7f) | 0x80);
  bytes.push(length >> 7);
}

function messageAddressesMetasByCategory(
  message: Message,
  options?: { legacySorting?: boolean },
) {
  const metaByAddress = new Map<
    Pubkey,
    { invoked: boolean; signer: boolean; writable: boolean }
  >();
  metaByAddress.set(message.payerAddress, {
    invoked: false,
    signer: true,
    writable: true,
  });
  for (const instruction of message.instructions) {
    const programMeta = metaByAddress.get(instruction.programAddress) ?? {
      invoked: false,
      signer: false,
      writable: false,
    };
    programMeta.invoked = true;
    metaByAddress.set(instruction.programAddress, programMeta);
    for (const input of instruction.inputs) {
      const inputMeta = metaByAddress.get(input.address) ?? {
        invoked: false,
        signer: false,
        writable: false,
      };
      inputMeta.signer = inputMeta.signer || input.signer;
      inputMeta.writable = inputMeta.writable || input.writable;
      metaByAddress.set(input.address, inputMeta);
    }
  }
  const addressesWithMeta = [...metaByAddress.entries()];
  if (options?.legacySorting) {
    addressesWithMeta.sort(([addressA, _metaA], [addressB, _metaB]) => {
      if (addressA === message.payerAddress) {
        return -1;
      }
      if (addressB === message.payerAddress) {
        return 1;
      }
      const stringA = pubkeyToBase58(addressA);
      const stringB = pubkeyToBase58(addressB);
      return stringA.localeCompare(stringB, "en", legacyCollatorOptions);
    });
  }
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
  return {
    writableSigners,
    readonlySigners,
    writableNonSigners,
    readonlyNonSigners,
  };
}

const legacyCollatorOptions: Intl.CollatorOptions = {
  localeMatcher: "best fit",
  usage: "sort",
  sensitivity: "variant",
  ignorePunctuation: false,
  numeric: false,
  caseFirst: "lower",
};
