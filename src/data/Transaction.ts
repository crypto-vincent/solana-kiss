import {
  BlockHash,
  blockHashFromBytes,
  blockHashToBytes,
  BlockSlot,
} from "./Block";
import { Instruction, InstructionInput } from "./Instruction";
import { JsonValue } from "./Json";
import {
  Pubkey,
  pubkeyFromBytes,
  pubkeyToBase58,
  pubkeyToBytes,
  pubkeyToVerifier,
} from "./Pubkey";
import { Signature, signatureFromBytes, signatureToBytes } from "./Signature";
import { Signer } from "./Signer";
import { BrandedType } from "./Utils";

// TODO (feature) - explorer links ?

export type TransactionRequest = {
  payerAddress: Pubkey;
  recentBlockHash: BlockHash;
  instructions: Array<Instruction>;
};

export type TransactionVersion = "legacy" | number;
export type TransactionMessage = BrandedType<
  Uint8Array,
  "TransactionMessage"
> & {
  length: number;
};
export type TransactionPacket = BrandedType<Uint8Array, "TransactionPacket"> & {
  length: number;
};

export type TransactionHandle = Signature;

export type TransactionExecution = {
  blockInfo: {
    time: Date | undefined;
    slot: BlockSlot;
  };
  logs: Array<string> | undefined;
  error: JsonValue | undefined;
  consumedComputeUnits: number;
  chargedFeesLamports: bigint | undefined;
};

export type TransactionFlow = Array<
  | { invocation: TransactionInvocation }
  | { data: Uint8Array }
  | { log: string }
  | { unknown: string }
>;
export type TransactionInvocation = {
  instruction: Instruction;
  flow: TransactionFlow;
  error: string | undefined;
  returnData: Uint8Array | undefined;
  consumedComputeUnits: number | undefined;
};

export async function transactionCompileAndSign(
  signers: Array<Signer>,
  transactionRequest: TransactionRequest,
  addressLookupTables?: Map<Pubkey, Array<Pubkey>>,
): Promise<TransactionPacket> {
  const transactionPacket = transactionCompileUnsigned(
    transactionRequest,
    addressLookupTables,
  );
  return await transactionSign(transactionPacket, signers);
}

export function transactionCompileUnsigned(
  transactionRequest: TransactionRequest,
  addressLookupTables?: Map<Pubkey, Array<Pubkey>>, // TODO - For address lookup tables (ALT)
): TransactionPacket {
  const {
    writableSigners,
    readonlySigners,
    writableNonSigners,
    readonlyNonSigners,
  } = addressesMetasByCategory(transactionRequest, {
    legacyAddressSorting: addressLookupTables === undefined,
  });
  const loadedWritableAddresses = new Array<Pubkey>();
  const loadedReadonlyAddresses = new Array<Pubkey>();
  const loadedAddressLookupTables = new Map<
    Pubkey,
    {
      writableIndexes: Array<number>;
      readonlyIndexes: Array<number>;
    }
  >();
  if (addressLookupTables !== undefined) {
    for (const [
      addressLookupTableAddress,
      addressLookupTableAddresses, // TODO - the naming is horendous here lol
    ] of addressLookupTables) {
      const writableIndexes = new Array<number>();
      const readonlyIndexes = new Array<number>();
      for (
        let writableNonSignerIndex = 0;
        writableNonSignerIndex < writableNonSigners.length;
        writableNonSignerIndex++
      ) {
        const writableNonSigner = writableNonSigners[writableNonSignerIndex]!;
        if (writableNonSigner[1].invoked) {
          continue;
        }
        const addressLookupTableIndex = addressLookupTableAddresses.findIndex(
          (address) => address === writableNonSigner[0],
        );
        if (addressLookupTableIndex !== -1) {
          loadedWritableAddresses.push(writableNonSigner[0]);
          writableIndexes.push(addressLookupTableIndex);
          writableNonSigners.splice(writableNonSignerIndex, 1);
          writableNonSignerIndex--; // TODO - this should be cleaner
        }
      }
      for (
        let readonlyNonSignerIndex = 0;
        readonlyNonSignerIndex < readonlyNonSigners.length;
        readonlyNonSignerIndex++
      ) {
        const readonlyNonSigner = readonlyNonSigners[readonlyNonSignerIndex]!;
        if (readonlyNonSigner[1].invoked) {
          continue;
        }
        const addressLookupTableIndex = addressLookupTableAddresses.findIndex(
          (address) => address === readonlyNonSigner[0],
        );
        if (addressLookupTableIndex !== -1) {
          loadedReadonlyAddresses.push(readonlyNonSigner[0]);
          readonlyIndexes.push(addressLookupTableIndex);
          readonlyNonSigners.splice(readonlyNonSignerIndex, 1);
          readonlyNonSignerIndex--;
        }
      }
      if (writableIndexes.length > 0 || readonlyIndexes.length > 0) {
        loadedAddressLookupTables.set(addressLookupTableAddress, {
          writableIndexes,
          readonlyIndexes,
        });
      }
    }
  }
  const staticAddresses = [
    ...writableSigners.map(([address]) => address),
    ...readonlySigners.map(([address]) => address),
    ...writableNonSigners.map(([address]) => address),
    ...readonlyNonSigners.map(([address]) => address),
  ];
  const indexByAddress = new Map<Pubkey, number>();
  for (const staticAddress of staticAddresses) {
    indexByAddress.set(staticAddress, indexByAddress.size);
  }
  for (const loadedWritableAddress of loadedWritableAddresses) {
    indexByAddress.set(loadedWritableAddress, indexByAddress.size);
  }
  for (const loadedReadonlyAddress of loadedReadonlyAddresses) {
    indexByAddress.set(loadedReadonlyAddress, indexByAddress.size);
  }
  const signaturesCount = writableSigners.length + readonlySigners.length;
  const bytes = new Array<number>();
  bytes.push(signaturesCount);
  for (let i = 0; i < signaturesCount * 64; i++) {
    bytes.push(0);
  }
  if (addressLookupTables !== undefined) {
    bytes.push(0x80);
  }
  bytes.push(signaturesCount);
  bytes.push(readonlySigners.length);
  bytes.push(readonlyNonSigners.length);
  bytes.push(staticAddresses.length);
  for (const staticAddress of staticAddresses) {
    for (const staticAddressByte of pubkeyToBytes(staticAddress)) {
      bytes.push(staticAddressByte);
    }
  }
  for (const recentBlockHashByte of blockHashToBytes(
    transactionRequest.recentBlockHash,
  )) {
    bytes.push(recentBlockHashByte);
  }
  varIntWrite(bytes, transactionRequest.instructions.length);
  for (const instruction of transactionRequest.instructions) {
    bytes.push(indexByAddress.get(instruction.programAddress)!);
    bytes.push(instruction.inputs.length);
    for (const input of instruction.inputs) {
      bytes.push(indexByAddress.get(input.address)!);
    }
    varIntWrite(bytes, instruction.data.length);
    for (const dataByte of instruction.data) {
      bytes.push(dataByte);
    }
  }
  if (addressLookupTables !== undefined) {
    bytes.push(loadedAddressLookupTables.size);
    for (const [
      addressLookupTableAddress,
      { writableIndexes, readonlyIndexes },
    ] of loadedAddressLookupTables.entries()) {
      bytes.push(...pubkeyToBytes(addressLookupTableAddress));
      bytes.push(writableIndexes.length);
      for (const writableIndex of writableIndexes) {
        bytes.push(writableIndex);
      }
      bytes.push(readonlyIndexes.length);
      for (const readonlyIndex of readonlyIndexes) {
        bytes.push(readonlyIndex);
      }
    }
  }
  if (bytes.length > 1232) {
    throw new Error(
      `Transaction: Too large: ${bytes.length} bytes (max: 1232 bytes)`,
    );
  }
  return new Uint8Array(bytes) as TransactionPacket;
}

export async function transactionSign(
  transactionPacket: TransactionPacket,
  signers: Array<Signer>,
) {
  const message = transactionExtractMessage(transactionPacket);
  const signing = transactionExtractSigning(transactionPacket);
  const signaturesBySignerAddress = new Map<Pubkey, Signature>();
  for (const signer of signers) {
    signaturesBySignerAddress.set(signer.address, await signer.sign(message));
  }
  const bytes = new Uint8Array(transactionPacket);
  let offset = 1;
  for (const { signerAddress } of signing) {
    const signature = signaturesBySignerAddress.get(signerAddress);
    if (signature !== undefined) {
      bytes.set(signatureToBytes(signature), offset);
    }
    offset += 64;
  }
  return bytes as TransactionPacket;
}

export async function transactionVerify(
  transactionPacket: TransactionPacket,
): Promise<void> {
  const message = transactionExtractMessage(transactionPacket);
  const signing = transactionExtractSigning(transactionPacket);
  for (const { signerAddress, signature } of signing) {
    const signerVerifier = await pubkeyToVerifier(signerAddress);
    if (!(await signerVerifier(signature, message))) {
      throw new Error(
        `Transaction: invalid signature for signer: ${signerAddress}`,
      );
    }
  }
}

export function transactionExtractMessage(
  transactionPacket: TransactionPacket,
): TransactionMessage {
  let offset = 0;
  const signaturesCount = byteRead(transactionPacket, offset++);
  offset += signaturesCount * 64;
  return bytesRead(
    transactionPacket,
    offset,
    transactionPacket.length - offset,
  ) as TransactionMessage;
}

export function transactionExtractSigning(
  transactionPacket: TransactionPacket,
): Array<{
  signerAddress: Pubkey;
  signature: Signature;
}> {
  let packetOffset = 0;
  const packetSignaturesCount = byteRead(transactionPacket, packetOffset++);
  const transactionMessage = transactionExtractMessage(transactionPacket);
  let messageOffset = 0;
  const firstMessageByte = byteRead(transactionMessage, messageOffset);
  if ((firstMessageByte & 0b10000000) !== 0) {
    messageOffset++;
  }
  const messageSignaturesCount = byteRead(transactionMessage, messageOffset++);
  if (packetSignaturesCount != messageSignaturesCount) {
    throw new Error(
      `Transaction: Mismatched signatures count between packet (${packetSignaturesCount}) and message (${messageSignaturesCount})`,
    );
  }
  messageOffset += 3;
  const signing = new Array<{
    signerAddress: Pubkey;
    signature: Signature;
  }>();
  for (let i = 0; i < messageSignaturesCount; i++) {
    const signerAddressBytes = bytesRead(transactionMessage, messageOffset, 32);
    const signatureBytes = bytesRead(transactionPacket, packetOffset, 64);
    messageOffset += 32;
    packetOffset += 64;
    signing.push({
      signerAddress: pubkeyFromBytes(signerAddressBytes),
      signature: signatureFromBytes(signatureBytes),
    });
  }
  return signing;
}

export function transactionDecompileRequest(
  transactionMessage: TransactionMessage,
  addressLookupTables?: Map<Pubkey, Array<Pubkey>>,
): TransactionRequest {
  let offset = 0;
  const firstByte = byteRead(transactionMessage, offset);
  if ((firstByte & 0b10000000) !== 0) {
    offset++;
  }
  const signatureCount = byteRead(transactionMessage, offset++);
  const readonlySignersCount = byteRead(transactionMessage, offset++);
  const readonlyNonSignersCount = byteRead(transactionMessage, offset++);
  const staticAddressesCount = byteRead(transactionMessage, offset++);
  const instructionsInputs = new Array<InstructionInput>();
  for (
    let staticAddressIndex = 0;
    staticAddressIndex < staticAddressesCount;
    staticAddressIndex++
  ) {
    const staticAddressBytes = bytesRead(transactionMessage, offset, 32);
    offset += 32;
    const address = pubkeyFromBytes(staticAddressBytes);
    if (staticAddressIndex < signatureCount - readonlySignersCount) {
      instructionsInputs.push({ address, signer: true, writable: true });
    } else if (staticAddressIndex < signatureCount) {
      instructionsInputs.push({ address, signer: true, writable: false });
    } else if (
      staticAddressIndex <
      staticAddressesCount - readonlyNonSignersCount
    ) {
      instructionsInputs.push({ address, signer: false, writable: true });
    } else {
      instructionsInputs.push({ address, signer: false, writable: false });
    }
  }
  const recentBlockHash = blockHashFromBytes(
    bytesRead(transactionMessage, offset, 32),
  );
  offset += 32;
  const instructionCount = varIntRead(transactionMessage, offset);
  offset += instructionCount.size;
  const compiledInstructions = new Array<{
    programIndex: number;
    inputsIndexes: Array<number>;
    dataBytes: Uint8Array;
  }>();
  for (let i = 0; i < instructionCount.value; i++) {
    const programIndex = byteRead(transactionMessage, offset++);
    const inputCount = byteRead(transactionMessage, offset++);
    const inputsIndexes = new Array<number>();
    for (let j = 0; j < inputCount; j++) {
      inputsIndexes.push(byteRead(transactionMessage, offset++));
    }
    const dataLength = varIntRead(transactionMessage, offset);
    offset += dataLength.size;
    const dataBytes = bytesRead(transactionMessage, offset, dataLength.value);
    offset += dataLength.value;
    compiledInstructions.push({ programIndex, inputsIndexes, dataBytes });
  }
  const addressLookupTablesCount = byteRead(transactionMessage, offset++);
  const loadedWritableAddresses = new Array<Pubkey>();
  const loadedReadonlyAddresses = new Array<Pubkey>();
  for (let i = 0; i < addressLookupTablesCount; i++) {
    const addressLookupTableAddress = pubkeyFromBytes(
      bytesRead(transactionMessage, offset, 32),
    );
    offset += 32;
    const addressLookupTableAddresses = addressLookupTables?.get(
      addressLookupTableAddress,
    );
    if (addressLookupTableAddresses === undefined) {
      throw new Error(
        `Transaction: Missing address lookup table addresses: ${addressLookupTableAddress}`,
      );
    }
    const loadedWritableCount = byteRead(transactionMessage, offset++);
    for (let j = 0; j < loadedWritableCount; j++) {
      loadedWritableAddresses.push(
        lookupLoadedAddress(
          addressLookupTableAddresses,
          byteRead(transactionMessage, offset++),
        ),
      );
    }
    const loadedReadonlyCount = byteRead(transactionMessage, offset++);
    for (let j = 0; j < loadedReadonlyCount; j++) {
      loadedReadonlyAddresses.push(
        lookupLoadedAddress(
          addressLookupTableAddresses,
          byteRead(transactionMessage, offset++),
        ),
      );
    }
  }
  for (const loadedWritableAddress of loadedWritableAddresses) {
    instructionsInputs.push({
      address: loadedWritableAddress,
      signer: false,
      writable: true,
    });
  }
  for (const loadedReadonlyAddress of loadedReadonlyAddresses) {
    instructionsInputs.push({
      address: loadedReadonlyAddress,
      signer: false,
      writable: false,
    });
  }
  const payerAddress = lookupInput(instructionsInputs, 0).address;
  const instructions = new Array<Instruction>();
  for (const compiledInstruction of compiledInstructions) {
    instructions.push({
      programAddress: lookupInput(
        instructionsInputs,
        compiledInstruction.programIndex,
      ).address,
      inputs: compiledInstruction.inputsIndexes.map((inputIndex) =>
        lookupInput(instructionsInputs, inputIndex),
      ),
      data: compiledInstruction.dataBytes,
    });
  }
  return { payerAddress, recentBlockHash, instructions };
}

function addressesMetasByCategory(
  transactionRequest: TransactionRequest,
  options?: { legacyAddressSorting?: boolean },
) {
  const metaByAddress = new Map<
    Pubkey,
    { invoked: boolean; signer: boolean; writable: boolean }
  >();
  metaByAddress.set(transactionRequest.payerAddress, {
    invoked: false,
    signer: true,
    writable: true,
  });
  for (const instruction of transactionRequest.instructions) {
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
      if (addressA === transactionRequest.payerAddress) {
        return -1;
      }
      if (addressB === transactionRequest.payerAddress) {
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

function varIntWrite(bytes: Array<number>, value: number) {
  if (value < 128) {
    bytes.push(value);
    return;
  }
  bytes.push((value & 0x7f) | 0x80);
  bytes.push(value >> 7);
}

function varIntRead(
  data: TransactionMessage | TransactionPacket,
  offset: number,
): { value: number; size: number } {
  const firstByte = byteRead(data, offset);
  if ((firstByte & 0x80) === 0) {
    return { value: firstByte, size: 1 };
  }
  const secondByte = byteRead(data, offset + 1);
  const length = (firstByte & 0x7f) | (secondByte << 7);
  return { value: length, size: 2 };
}

function byteRead(
  bytes: TransactionMessage | TransactionPacket,
  offset: number,
): number {
  if (offset < 0 || offset > bytes.length) {
    throw new Error(
      `Transaction: Invalid bytes, failed to read at offset ${offset} (found ${bytes.length} bytes)`,
    );
  }
  return (bytes as Uint8Array)[offset]!;
}

function bytesRead(
  bytes: TransactionMessage | TransactionPacket,
  offset: number,
  size: number,
): Uint8Array {
  if (offset + size > bytes.length) {
    throw new Error(
      `Transaction: Invalid bytes, failed to read ${size} bytes at offset ${offset} (found ${bytes.length} bytes)`,
    );
  }
  return (bytes as Uint8Array).slice(offset, offset + size);
}

function lookupInput(
  inputs: Array<InstructionInput>,
  index: number,
): InstructionInput {
  if (index < 0 || index >= inputs.length) {
    throw new Error(
      `Transaction: Invalid instruction input index ${index} (found ${inputs.length} inputs)`,
    );
  }
  return inputs[index]!;
}

function lookupLoadedAddress(
  addressLookupTableAddresses: Array<Pubkey>,
  index: number,
): Pubkey {
  if (index < 0 || index >= addressLookupTableAddresses.length) {
    throw new Error(
      `Transaction: Invalid address lookup table index ${index} (found ${addressLookupTableAddresses.length} addresses)`,
    );
  }
  return addressLookupTableAddresses[index]!;
}
