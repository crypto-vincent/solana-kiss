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
} from "./Pubkey";
import { Signature, signatureFromBytes, signatureToBytes } from "./Signature";
import { Signer } from "./Signer";
import { BrandedType, expectDefined } from "./Utils";

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

// TODO - should this be a branded type ?
export type TransactionId = Signature;

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
  addressLookupTables?: Array<any>, // TODO (ALT) - handle LUTs
): Promise<TransactionPacket> {
  const transactionPacket = transactionCompileUnsigned(
    transactionRequest,
    addressLookupTables,
  );
  return await transactionSign(transactionPacket, signers);
}

export function transactionCompileUnsigned(
  transactionRequest: TransactionRequest,
  addressLookupTables?: Array<any>, // TODO (ALT) - handle LUTs
): TransactionPacket {
  const {
    writableSigners,
    readonlySigners,
    writableNonSigners,
    readonlyNonSigners,
  } = addressesMetasByCategory(transactionRequest, {
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
  const signaturesCount = writableSigners.length + readonlySigners.length;
  const packetBytes = new Array<number>();
  packetBytes.push(signaturesCount);
  for (let i = 0; i < signaturesCount * 64; i++) {
    packetBytes.push(0);
  }
  if (addressLookupTables !== undefined) {
    packetBytes.push(0x80);
  }
  packetBytes.push(signaturesCount);
  packetBytes.push(readonlySigners.length);
  packetBytes.push(readonlyNonSigners.length);
  packetBytes.push(staticAddresses.length);
  for (const staticAddress of staticAddresses) {
    for (const staticAddressByte of pubkeyToBytes(staticAddress)) {
      packetBytes.push(staticAddressByte);
    }
  }
  for (const recentBlockHashByte of blockHashToBytes(
    transactionRequest.recentBlockHash,
  )) {
    packetBytes.push(recentBlockHashByte);
  }
  varIntWrite(packetBytes, transactionRequest.instructions.length);
  for (const instruction of transactionRequest.instructions) {
    packetBytes.push(staticIndexByAddress.get(instruction.programAddress)!);
    packetBytes.push(instruction.inputs.length);
    for (const input of instruction.inputs) {
      packetBytes.push(staticIndexByAddress.get(input.address)!);
    }
    varIntWrite(packetBytes, instruction.data.length);
    for (const byte of instruction.data) {
      packetBytes.push(byte);
    }
  }
  if (addressLookupTables !== undefined) {
    // TODO (ALT) - handle address lookup tables
    packetBytes.push(0);
  }
  if (packetBytes.length > 1232) {
    throw new Error(
      `Transaction: Too big: ${packetBytes.length} bytes (max: 1232 bytes)`,
    );
  }
  return new Uint8Array(packetBytes) as TransactionPacket;
}

export async function transactionSign(
  transactionPacket: TransactionPacket,
  signers: Array<Signer>,
) {
  const message = transactionGetMessage(transactionPacket);
  const signing = transactionExtractSigning(transactionPacket);
  const signaturesBySignerAddress = new Map<Pubkey, Signature>();
  for (const signer of signers) {
    signaturesBySignerAddress.set(signer.address, await signer.sign(message));
  }
  const packetBytes = new Uint8Array(transactionPacket);
  let packetOffset = 1;
  for (const { signerAddress } of signing) {
    const signature = signaturesBySignerAddress.get(signerAddress);
    if (signature !== undefined) {
      packetBytes.set(signatureToBytes(signature), packetOffset);
      packetOffset += 64;
    }
  }
  return packetBytes as TransactionPacket;
}

export function transactionGetMessage(
  transactionPacket: TransactionPacket,
): TransactionMessage {
  const bytes = transactionPacket as Uint8Array;
  let offset = 0;
  const signaturesCount = byteRead(bytes, offset++);
  offset += signaturesCount * 64;
  return bytesRead(bytes, offset, bytes.length - offset) as TransactionMessage;
}

export function transactionExtractSigning(
  transactionPacket: TransactionPacket,
): Array<{
  signerAddress: Pubkey;
  signature: Signature;
}> {
  const packetBytes = transactionPacket as Uint8Array;
  let packetOffset = 0;
  const packetSignaturesCount = byteRead(packetBytes, packetOffset++);
  const messageBytes = transactionGetMessage(transactionPacket) as Uint8Array;
  let messageOffset = 0;
  const firstMessageByte = byteRead(messageBytes, messageOffset);
  if ((firstMessageByte & 0b10000000) !== 0) {
    messageOffset++;
  }
  const messageSignaturesCount = byteRead(messageBytes, messageOffset++);
  if (packetSignaturesCount != messageSignaturesCount) {
    throw new Error(``);
  }
  messageOffset += 3;
  const signing = new Array<{
    signerAddress: Pubkey;
    signature: Signature;
  }>();
  for (let i = 0; i < packetSignaturesCount; i++) {
    const signerAddressBytes = bytesRead(messageBytes, messageOffset, 32);
    const signatureBytes = bytesRead(packetBytes, packetOffset, 64);
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
): TransactionRequest {
  let bytes = transactionMessage as Uint8Array;
  let offset = 0;
  const firstByte = byteRead(bytes, offset);
  if ((firstByte & 0b10000000) !== 0) {
    offset++;
  }
  const signatureCount = byteRead(bytes, offset++);
  const readonlySignersCount = byteRead(bytes, offset++);
  const readonlyNonSignersCount = byteRead(bytes, offset++);
  const staticAddressesCount = byteRead(bytes, offset++);
  const instructionsInputs = new Array<InstructionInput>();
  for (
    let staticAddressIndex = 0;
    staticAddressIndex < staticAddressesCount;
    staticAddressIndex++
  ) {
    const staticAddressBytes = bytesRead(bytes, offset, 32);
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
  const recentBlockHash = blockHashFromBytes(bytesRead(bytes, offset, 32));
  offset += 32;
  const instructionCount = varIntRead(bytes, offset);
  offset += instructionCount.size;
  const compiledInstructions = new Array<{
    programIndex: number;
    inputsIndexes: Array<number>;
    dataBytes: Uint8Array;
  }>();
  for (let i = 0; i < instructionCount.value; i++) {
    const programIndex = byteRead(bytes, offset++);
    const inputCount = byteRead(bytes, offset++);
    const inputsIndexes = new Array<number>();
    for (let j = 0; j < inputCount; j++) {
      inputsIndexes.push(byteRead(bytes, offset++));
    }
    const dataLength = varIntRead(bytes, offset);
    offset += dataLength.size;
    const dataBytes = bytesRead(bytes, offset, dataLength.value);
    offset += dataLength.value;
    compiledInstructions.push({ programIndex, inputsIndexes, dataBytes });
  }
  // TODO (ALT) - handle address lookup tables
  const instructions = new Array<Instruction>();
  for (const compiledInstruction of compiledInstructions) {
    instructions.push({
      programAddress: expectDefined(
        instructionsInputs[compiledInstruction.programIndex]?.address,
      ),
      inputs: compiledInstruction.inputsIndexes.map((inputIndex) =>
        expectDefined(instructionsInputs[inputIndex]),
      ),
      data: compiledInstruction.dataBytes,
    });
  }
  return {
    payerAddress: expectDefined(instructionsInputs[0]?.address),
    recentBlockHash,
    instructions,
  };
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
  bytes: Uint8Array,
  offset: number,
): { value: number; size: number } {
  const firstByte = byteRead(bytes, offset);
  if ((firstByte & 0x80) === 0) {
    return { value: firstByte, size: 1 };
  }
  const secondByte = byteRead(bytes, offset + 1);
  const length = (firstByte & 0x7f) | (secondByte << 7);
  return { value: length, size: 2 };
}

function byteRead(bytes: Uint8Array, offset: number): number {
  if (offset < 0 || offset > bytes.length) {
    throw new Error(``);
  }
  return bytes[offset]!;
}

function bytesRead(
  bytes: Uint8Array,
  offset: number,
  size: number,
): Uint8Array {
  if (offset + size > bytes.length) {
    throw new Error(``);
  }
  return bytes.slice(offset, offset + size);
}
