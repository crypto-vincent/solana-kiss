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
import { BrandedType } from "./Utils";

export type Message = {
  payerAddress: Pubkey;
  recentBlockHash: BlockHash;
  instructions: Array<Instruction>;
};

export type MessageCompiled = BrandedType<Uint8Array, "MessageCompiled">;

export function messageCompile(
  message: Message,
  addressLookupTables?: Array<any>, // TODO (ALT) - handle LUTs
): MessageCompiled {
  const {
    writableSigners,
    readonlySigners,
    writableNonSigners,
    readonlyNonSigners,
  } = messageAddressesMetasByCategory(message, {
    legacyAddressSorting: addressLookupTables === undefined,
  });
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
  const messageCompiledBytes = new Array<number>();
  if (addressLookupTables !== undefined) {
    messageCompiledBytes.push(0x80);
  }
  messageCompiledBytes.push(writableSigners.length + readonlySigners.length);
  messageCompiledBytes.push(readonlySigners.length);
  messageCompiledBytes.push(readonlyNonSigners.length);
  messageCompiledBytes.push(staticAddresses.length);
  for (const staticAddress of staticAddresses) {
    const staticAddressBytes = pubkeyToBytes(staticAddress);
    for (const byte of staticAddressBytes) {
      messageCompiledBytes.push(byte);
    }
  }
  const recentBlockHashBytes = blockHashToBytes(message.recentBlockHash);
  for (const byte of recentBlockHashBytes) {
    messageCompiledBytes.push(byte);
  }
  messageBytesPushShortVec16(messageCompiledBytes, message.instructions.length);
  for (const instruction of message.instructions) {
    const programIndex = staticIndexByAddress.get(instruction.programAddress);
    if (programIndex === undefined) {
      throw new Error(
        `Message: Could not find program address in static addresses: ${instruction.programAddress}`,
      );
    }
    messageCompiledBytes.push(programIndex);
    messageCompiledBytes.push(instruction.inputs.length);
    for (const input of instruction.inputs) {
      const inputIndex = staticIndexByAddress.get(input.address);
      if (inputIndex === undefined) {
        throw new Error(
          `Message: Could not find input address in static addresses: ${input.address}`,
        );
      }
      messageCompiledBytes.push(inputIndex);
    }
    messageBytesPushShortVec16(messageCompiledBytes, instruction.data.length);
    for (const byte of instruction.data) {
      messageCompiledBytes.push(byte);
    }
  }
  if (addressLookupTables !== undefined) {
    // TODO (ALT) - handle address lookup tables
    messageCompiledBytes.push(0);
  }
  return new Uint8Array(messageCompiledBytes) as MessageCompiled;
}

export function messageDecompileVersion(
  messageCompiled: MessageCompiled,
): "legacy" | number {
  const messageCompiledBytes = messageCompiled as Uint8Array;
  if (messageCompiledBytes.length === 0) {
    throw new Error("Message: Cannot get version of an empty compiled message");
  }
  const firstByte = messageCompiledBytes[0]!;
  if ((firstByte & 0b10000000) !== 0) {
    return firstByte & 0b01111111;
  }
  return "legacy";
}

export function messageDecompileSignersAddresses(
  messageCompiled: MessageCompiled,
): Array<Pubkey> {
  const messageVersion = messageDecompileVersion(messageCompiled);
  const messageHeaderOffset = messageVersion === "legacy" ? 0 : 1;
  const messageHeaderLength = messageHeaderOffset + 4;
  const messageCompiledBytes = messageCompiled as Uint8Array;
  if (messageCompiledBytes.length < messageHeaderLength) {
    throw new Error(
      `Message: Expected valid compiled message header (found ${messageCompiledBytes.length} bytes)`,
    );
  }
  const signerCount = messageCompiledBytes[messageHeaderOffset + 0]!;
  if (messageCompiledBytes.length < messageHeaderLength + signerCount * 32) {
    throw new Error(
      `Message: Expected valid compiled message with at least ${signerCount} accounts (found ${messageCompiledBytes.length} bytes)`,
    );
  }
  const signersAddresses = new Array<Pubkey>();
  for (let signerIndex = 0; signerIndex < signerCount; signerIndex++) {
    const signerAddressOffset = messageHeaderLength + signerIndex * 32;
    const signerAddressBytes = messageCompiledBytes.slice(
      signerAddressOffset,
      signerAddressOffset + 32,
    );
    signersAddresses.push(pubkeyFromBytes(signerAddressBytes));
  }
  return signersAddresses;
}

export async function messageSignWithSigners(
  messageCompiled: MessageCompiled,
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
  return messageSignedBySignatures(
    messageCompiled,
    signaturesBySignerAddress,
    options,
  );
}

export function messageSignedBySignatures(
  messageCompiled: MessageCompiled,
  signaturesBySignerAddress: Map<Pubkey, Signature>,
  options?: { ignoreMissingSignatures?: boolean },
): Uint8Array {
  const signersAddresses = messageDecompileSignersAddresses(messageCompiled);
  const messageCompiledBytes = messageCompiled as Uint8Array;
  const messageSignaturesLength = 1 + 64 * signersAddresses.length;
  const messageSignedTotalLength =
    messageSignaturesLength + messageCompiledBytes.length;
  if (messageSignedTotalLength > 1232) {
    throw new Error(
      `Message: Signed message is too large: ${messageSignedTotalLength} bytes (max: 1232 bytes)`,
    );
  }
  const messageSigned = new Uint8Array(messageSignedTotalLength);
  messageSigned[0] = signersAddresses.length;
  for (
    let signerIndex = 0;
    signerIndex < signersAddresses.length;
    signerIndex++
  ) {
    const signerAddress = signersAddresses[signerIndex]!;
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
  messageSigned.set(messageCompiledBytes, messageSignaturesLength);
  return messageSigned;
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
  options?: { legacyAddressSorting?: boolean },
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
  if (options?.legacyAddressSorting) {
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
