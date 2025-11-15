import {
  BlockHash,
  blockHashFromBytes,
  blockHashToBytes,
  BlockSlot,
} from "./Block";
import { InstructionInput, InstructionRequest } from "./Instruction";
import { JsonObject } from "./Json";
import {
  Pubkey,
  pubkeyFromBytes,
  pubkeyToBase58,
  pubkeyToBytes,
  pubkeyToVerifier,
} from "./Pubkey";
import { Signature, signatureFromBytes, signatureToBytes } from "./Signature";
import { Signer } from "./Signer";
import { Branded } from "./Utils";
import { WalletAccount } from "./Wallet";

export type TransactionRequest = {
  payerAddress: Pubkey;
  recentBlockHash: BlockHash;
  instructions: Array<InstructionRequest>;
};
export type TransactionAddressLookupTable = {
  tableAddress: Pubkey;
  lookupAddresses: Array<Pubkey>;
};

export type TransactionVersion = "legacy" | number;
export type TransactionMessage = Branded<Uint8Array, "TransactionMessage"> & {
  length: number;
};
export type TransactionPacket = Branded<Uint8Array, "TransactionPacket"> & {
  length: number;
};

export type TransactionHandle = Signature;

export type TransactionExecution = {
  blockInfo: {
    time: Date | undefined;
    slot: BlockSlot;
  };
  logs: Array<string> | undefined;
  error: null | string | JsonObject;
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
  instructionRequest: InstructionRequest;
  flow: TransactionFlow;
  error: string | undefined;
  returned: Uint8Array | undefined;
  consumedComputeUnits: number | undefined;
};

export async function transactionCompileAndSign(
  signers: Array<Signer | WalletAccount>,
  transactionRequest: TransactionRequest,
  transactionAddressLookupTables?: Array<TransactionAddressLookupTable>,
): Promise<TransactionPacket> {
  const transactionPacket = transactionCompileUnsigned(
    transactionRequest,
    transactionAddressLookupTables,
  );
  return await transactionSign(transactionPacket, signers);
}

export function transactionCompileUnsigned(
  transactionRequest: TransactionRequest,
  transactionAddressLookupTables?: Array<TransactionAddressLookupTable>,
): TransactionPacket {
  let {
    writableSigners,
    readonlySigners,
    writableNonSigners,
    readonlyNonSigners,
  } = addressesMetasByCategory(transactionRequest, {
    legacyAddressSorting: transactionAddressLookupTables === undefined,
  });
  const loadedWritableAddresses = new Array<Pubkey>();
  const loadedReadonlyAddresses = new Array<Pubkey>();
  const loadedAddressLookupTables = new Array<{
    tableAddress: Pubkey;
    writableIndexes: Array<number>;
    readonlyIndexes: Array<number>;
  }>();
  if (transactionAddressLookupTables !== undefined) {
    for (const transactionAddressLookupTable of transactionAddressLookupTables) {
      const lookupAddresses = transactionAddressLookupTable.lookupAddresses;
      const writableIndexes = new Array<number>();
      const readonlyIndexes = new Array<number>();
      writableNonSigners = writableNonSigners.filter(([address, meta]) => {
        if (meta.invoked) {
          return true;
        }
        const lookupAddressIndex = lookupAddresses.indexOf(address);
        if (lookupAddressIndex !== -1) {
          loadedWritableAddresses.push(address);
          writableIndexes.push(lookupAddressIndex);
          return false;
        }
        return true;
      });
      readonlyNonSigners = readonlyNonSigners.filter(([address, meta]) => {
        if (meta.invoked) {
          return true;
        }
        const lookupAddressIndex = lookupAddresses.indexOf(address);
        if (lookupAddressIndex !== -1) {
          loadedReadonlyAddresses.push(address);
          readonlyIndexes.push(lookupAddressIndex);
          return false;
        }
        return true;
      });
      if (writableIndexes.length > 0 || readonlyIndexes.length > 0) {
        loadedAddressLookupTables.push({
          tableAddress: transactionAddressLookupTable.tableAddress,
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
  const byteArray = new Array<number>();
  byteArray.push(signaturesCount);
  for (let i = 0; i < signaturesCount * 64; i++) {
    byteArray.push(0);
  }
  if (transactionAddressLookupTables !== undefined) {
    byteArray.push(0x80);
  }
  byteArray.push(signaturesCount);
  byteArray.push(readonlySigners.length);
  byteArray.push(readonlyNonSigners.length);
  byteArray.push(staticAddresses.length);
  for (const staticAddress of staticAddresses) {
    byteArray.push(...pubkeyToBytes(staticAddress));
  }
  byteArray.push(...blockHashToBytes(transactionRequest.recentBlockHash));
  varIntWrite(byteArray, transactionRequest.instructions.length);
  for (const instruction of transactionRequest.instructions) {
    byteArray.push(indexByAddress.get(instruction.programAddress)!);
    varIntWrite(byteArray, instruction.inputs.length);
    for (const input of instruction.inputs) {
      byteArray.push(indexByAddress.get(input.address)!);
    }
    varIntWrite(byteArray, instruction.data.length);
    byteArray.push(...instruction.data);
  }
  if (transactionAddressLookupTables !== undefined) {
    byteArray.push(loadedAddressLookupTables.length);
    for (const {
      tableAddress,
      writableIndexes,
      readonlyIndexes,
    } of loadedAddressLookupTables) {
      byteArray.push(...pubkeyToBytes(tableAddress));
      byteArray.push(writableIndexes.length);
      byteArray.push(...writableIndexes);
      byteArray.push(readonlyIndexes.length);
      byteArray.push(...readonlyIndexes);
    }
  }
  if (byteArray.length > 1232) {
    throw new Error(
      `Transaction: Too large: ${byteArray.length} bytes (max: 1232 bytes)`,
    );
  }
  return new Uint8Array(byteArray) as TransactionPacket;
}

export async function transactionSign(
  transactionPacket: TransactionPacket,
  signers: Array<Signer | WalletAccount>,
) {
  const signaturesBySignerAddress = new Map<Pubkey, Signature>();
  const message = transactionExtractMessage(transactionPacket);
  for (const signer of signers) {
    if ("sign" in signer) {
      signaturesBySignerAddress.set(signer.address, await signer.sign(message));
    }
  }
  const bytes = new Uint8Array(transactionPacket);
  let offset = 1;
  const signing = transactionExtractSigning(transactionPacket);
  for (const { signerAddress } of signing) {
    const signature = signaturesBySignerAddress.get(signerAddress);
    if (signature !== undefined) {
      bytes.set(signatureToBytes(signature), offset);
    }
    offset += 64;
  }
  let packet = bytes as TransactionPacket;
  for (const signer of signers) {
    if ("signTransaction" in signer) {
      packet = await signer.signTransaction(packet);
    }
  }
  return packet;
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
  transactionAddressLookupTables?: Array<TransactionAddressLookupTable>,
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
    const inputCount = varIntRead(transactionMessage, offset);
    offset += inputCount.size;
    const inputsIndexes = new Array<number>();
    for (let j = 0; j < inputCount.value; j++) {
      inputsIndexes.push(byteRead(transactionMessage, offset++));
    }
    const dataLength = varIntRead(transactionMessage, offset);
    offset += dataLength.size;
    const dataBytes = bytesRead(transactionMessage, offset, dataLength.value);
    offset += dataLength.value;
    compiledInstructions.push({ programIndex, inputsIndexes, dataBytes });
  }
  if (offset < transactionMessage.length) {
    const loadedWritableAddresses = new Array<Pubkey>();
    const loadedReadonlyAddresses = new Array<Pubkey>();
    const loadedAddressLookupTablesCount = byteRead(
      transactionMessage,
      offset++,
    );
    for (let i = 0; i < loadedAddressLookupTablesCount; i++) {
      const loadedAddressLookupTable = pubkeyFromBytes(
        bytesRead(transactionMessage, offset, 32),
      );
      offset += 32;
      const transactionAddressLookupTable =
        transactionAddressLookupTables?.find(
          (transactionLookupTable) =>
            transactionLookupTable.tableAddress === loadedAddressLookupTable,
        );
      if (transactionAddressLookupTable === undefined) {
        throw new Error(
          `Transaction: Missing address lookup table: ${loadedAddressLookupTable}`,
        );
      }
      const loadedWritableCount = byteRead(transactionMessage, offset++);
      for (let j = 0; j < loadedWritableCount; j++) {
        loadedWritableAddresses.push(
          lookupLoadedAddress(
            transactionAddressLookupTable.lookupAddresses,
            byteRead(transactionMessage, offset++),
          ),
        );
      }
      const loadedReadonlyCount = byteRead(transactionMessage, offset++);
      for (let j = 0; j < loadedReadonlyCount; j++) {
        loadedReadonlyAddresses.push(
          lookupLoadedAddress(
            transactionAddressLookupTable.lookupAddresses,
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
  }
  const payerAddress = lookupInput(instructionsInputs, 0).address;
  const instructions = new Array<InstructionRequest>();
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
  options?: {
    legacyAddressSorting?: boolean;
  },
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

function varIntWrite(byteArray: Array<number>, value: number) {
  if (value < 128) {
    byteArray.push(value);
    return;
  }
  byteArray.push((value & 0x7f) | 0x80);
  byteArray.push(value >> 7);
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
  if (offset < 0 || offset >= bytes.length) {
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
  transactionLookupTableAddresses: Array<Pubkey>,
  index: number,
): Pubkey {
  if (index < 0 || index >= transactionLookupTableAddresses.length) {
    throw new Error(
      `Transaction: Invalid address lookup table index ${index} (found ${transactionLookupTableAddresses.length} addresses)`,
    );
  }
  return transactionLookupTableAddresses[index]!;
}
