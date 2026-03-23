import { base58BytesLength } from "./Base58";
import { BlockHash, blockHashFromBytes, blockHashToBytes } from "./Block";
import { InstructionInput, InstructionRequest } from "./Instruction";
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
import { varIntDecode } from "./VarInt";
import { WalletAccount } from "./Wallet";

/** Inputs required to build a Solana transaction. */
export type TransactionRequest = {
  /** Fee-payer public key. Must be a writable signer. */
  payerAddress: Pubkey;
  /** Recent block hash (sets ~90s expiry window). */
  recentBlockHash: BlockHash;
  /** Ordered list of instructions to execute in this transaction. */
  instructionsRequests: Array<InstructionRequest>;
};

/** On-chain address lookup table (ALT) and the subset of addresses it references. */
export type TransactionAddressLookupTable = {
  /** The on-chain address of the address lookup table account. */
  tableAddress: Pubkey;
  /** Public keys from the lookup table referenced by the transaction. */
  lookupAddresses: Array<Pubkey>;
};

/** Wire-format transaction version. `"legacy"` = original; `number` = versioned. */
export type TransactionVersion = "legacy" | number;

/** Serialized transaction body (header + keys + blockhash + instructions). Branded `Uint8Array`. */
export type TransactionMessage = Branded<Uint8Array, "TransactionMessage"> & {
  length: number;
};

/** Wire-ready transaction with signature slots + message. Branded `Uint8Array`. */
export type TransactionPacket = Branded<Uint8Array, "TransactionPacket"> & {
  length: number;
};

/** Post-processing or wallet-signing function for a {@link TransactionPacket}. */
export type TransactionProcessor = (
  transactionPacket: TransactionPacket,
) => Promise<TransactionPacket>;

/** Opaque Base58-encoded transaction reference (backed by the first signer signature). */
export type TransactionHandle = Branded<string, "TransactionHandle">;

/**
 * Creates a {@link TransactionHandle} from a Base58 string.
 * @param base58 - 64-byte signature as Base58.
 * @returns Typed {@link TransactionHandle}.
 * @throws If decoded bytes are not 64 bytes.
 */
export function transactionHandleFromBase58(base58: string): TransactionHandle {
  const bytesLength = base58BytesLength(base58);
  if (bytesLength !== 64) {
    throw new Error(
      `TransactionHandle: Expected 64 bytes (found: ${bytesLength})`,
    );
  }
  return base58 as TransactionHandle;
}

/**
 * Returns the Base58 string of a {@link TransactionHandle}.
 * @param handle - Transaction handle.
 * @returns Base58 string.
 */
export function transactionHandleToBase58(handle: TransactionHandle): string {
  return handle as string;
}

/**
 * Creates a {@link TransactionPacket} from raw bytes, validating structure.
 * @param bytes - Raw bytes.
 * @returns Typed {@link TransactionPacket}.
 * @throws If not a valid transaction packet.
 */
export function transactionPacketFromBytes(
  bytes: Uint8Array,
): TransactionPacket {
  const transactionPacket = bytes as TransactionPacket;
  checkPacket(transactionPacket);
  return transactionPacket;
}

/**
 * Returns the raw bytes of a {@link TransactionPacket}.
 * @returns Raw byte array.
 */
export function transactionPacketToBytes(
  transactionPacket: TransactionPacket,
): Uint8Array {
  return transactionPacket as Uint8Array;
}

/**
 * Compiles a {@link TransactionRequest} into a signed {@link TransactionPacket}.
 * @param signers - Signers ({@link Signer}, {@link WalletAccount}, or {@link TransactionProcessor}).
 * @param transactionRequest - Fee payer, block hash, and instructions.
 * @param transactionAddressLookupTables - Optional ALTs for versioned transactions.
 * @returns Fully signed {@link TransactionPacket}.
 */
export async function transactionCompileAndSign(
  signers: Array<Signer | WalletAccount | TransactionProcessor>,
  transactionRequest: TransactionRequest,
  transactionAddressLookupTables?: Array<TransactionAddressLookupTable>,
): Promise<TransactionPacket> {
  const transactionPacket = transactionCompileUnsigned(
    transactionRequest,
    transactionAddressLookupTables,
  );
  return transactionSign(transactionPacket, signers);
}

/**
 * Compiles a {@link TransactionRequest} into an unsigned {@link TransactionPacket} with zeroed signature slots.
 * @param transactionRequest - Fee payer, block hash, and instructions.
 * @param transactionAddressLookupTables - Optional ALTs for versioned transactions.
 * @returns Unsigned {@link TransactionPacket}.
 * @throws If packet exceeds the 1232-byte limit.
 */
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
  varIntWrite(byteArray, transactionRequest.instructionsRequests.length);
  for (const instruction of transactionRequest.instructionsRequests) {
    byteArray.push(indexByAddress.get(instruction.programAddress)!);
    varIntWrite(byteArray, instruction.instructionInputs.length);
    for (const input of instruction.instructionInputs) {
      byteArray.push(indexByAddress.get(input.address)!);
    }
    varIntWrite(byteArray, instruction.instructionData.length);
    byteArray.push(...instruction.instructionData);
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

/**
 * Signs a {@link TransactionPacket}, filling in signature slots.
 * @param transactionPacket - Unsigned (or partially signed) transaction.
 * @param signers - Signers to apply.
 * @returns Updated {@link TransactionPacket}.
 */
export async function transactionSign(
  transactionPacket: TransactionPacket,
  signers: Array<Signer | WalletAccount | TransactionProcessor>,
) {
  const signaturesBySignerAddress = new Map<Pubkey, Signature>();
  const transactionMessage = transactionExtractMessage(transactionPacket);
  for (const signer of signers) {
    if ("sign" in signer) {
      signaturesBySignerAddress.set(
        signer.address,
        await signer.sign(transactionMessage),
      );
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
  transactionPacket = bytes as TransactionPacket;
  for (const signer of signers) {
    if ("signTransaction" in signer) {
      transactionPacket = await signer.signTransaction(transactionPacket);
    }
    if (signer instanceof Function) {
      transactionPacket = await signer(transactionPacket);
    }
  }
  return transactionPacket;
}

/**
 * Verifies all signatures in a {@link TransactionPacket}.
 * @param transactionPacket - Signed transaction to verify.
 * @throws If any signature fails verification.
 */
export async function transactionVerify(
  transactionPacket: TransactionPacket,
): Promise<void> {
  const transactionMessage = transactionExtractMessage(transactionPacket);
  const signing = transactionExtractSigning(transactionPacket);
  for (const { signerAddress, signature } of signing) {
    const signerVerifier = await pubkeyToVerifier(signerAddress);
    if (!(await signerVerifier(signature, transactionMessage))) {
      throw new Error(
        `Transaction: invalid signature for signer: ${signerAddress}`,
      );
    }
  }
}

/**
 * Extracts the {@link TransactionMessage} from a {@link TransactionPacket}.
 * @returns Message portion.
 */
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

/**
 * Extracts `{ signerAddress, signature }` pairs from a {@link TransactionPacket}.
 * @param transactionPacket - Partially or fully signed transaction.
 * @returns Array of signer address + signature pairs.
 * @throws If signature count in the packet header disagrees with the message header.
 */
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
  checkSignaturesCount(
    packetSignaturesCount,
    byteRead(transactionMessage, messageOffset++),
  );
  messageOffset += 3;
  const signing = new Array<{
    signerAddress: Pubkey;
    signature: Signature;
  }>();
  for (let i = 0; i < packetSignaturesCount; i++) {
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

/**
 * Decompiles a {@link TransactionMessage} back into a {@link TransactionRequest}.
 * @param transactionMessage - Raw message bytes.
 * @param transactionAddressLookupTables - ALTs needed to resolve loaded accounts.
 * @returns Reconstructed {@link TransactionRequest}.
 * @throws If a referenced lookup table is not supplied.
 */
export function transactionDecompileRequest(
  transactionMessage: TransactionMessage,
  transactionAddressLookupTables?: Array<TransactionAddressLookupTable>,
): TransactionRequest {
  let offset = 0;
  const firstMessageByte = byteRead(transactionMessage, offset);
  if ((firstMessageByte & 0b10000000) !== 0) {
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
  offset += instructionCount.length;
  const compiledInstructions = new Array<{
    programIndex: number;
    inputsIndexes: Array<number>;
    dataBytes: Uint8Array;
  }>();
  for (let i = 0; i < instructionCount.value; i++) {
    const programIndex = byteRead(transactionMessage, offset++);
    const inputCount = varIntRead(transactionMessage, offset);
    offset += inputCount.length;
    const inputsIndexes = new Array<number>();
    for (let j = 0; j < inputCount.value; j++) {
      inputsIndexes.push(byteRead(transactionMessage, offset++));
    }
    const dataLength = varIntRead(transactionMessage, offset);
    offset += dataLength.length;
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
      instructionInputs: compiledInstruction.inputsIndexes.map((inputIndex) =>
        lookupInput(instructionsInputs, inputIndex),
      ),
      instructionData: compiledInstruction.dataBytes,
    });
  }
  return { payerAddress, recentBlockHash, instructionsRequests: instructions };
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
  for (const instruction of transactionRequest.instructionsRequests) {
    const programMeta = metaByAddress.get(instruction.programAddress) ?? {
      invoked: false,
      signer: false,
      writable: false,
    };
    programMeta.invoked = true;
    metaByAddress.set(instruction.programAddress, programMeta);
    for (const input of instruction.instructionInputs) {
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
  data: Uint8Array | TransactionMessage | TransactionPacket,
  offset: number,
): { value: number; length: number } {
  const [length, value] = varIntDecode(byteRead, data, offset);
  return { value: Number(value), length };
}

function byteRead(
  bytes: Uint8Array | TransactionMessage | TransactionPacket,
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
  bytes: Uint8Array | TransactionMessage | TransactionPacket,
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

function checkPacket(transactionPacket: TransactionPacket) {
  let offset = 0;
  const signaturesCount = byteRead(transactionPacket, offset++);
  offset += signaturesCount * 64;
  const firstMessageByte = byteRead(transactionPacket, offset);
  if ((firstMessageByte & 0b10000000) !== 0) {
    offset++;
  }
  checkSignaturesCount(signaturesCount, byteRead(transactionPacket, offset++));
  offset += 2;
  const staticAddressesCount = byteRead(transactionPacket, offset++);
  offset += staticAddressesCount * 32;
  offset += 32;
  const instructionCount = varIntRead(transactionPacket, offset);
  offset += instructionCount.length;
  for (let i = 0; i < instructionCount.value; i++) {
    offset++;
    const inputCount = varIntRead(transactionPacket, offset);
    offset += inputCount.length + inputCount.value;
    const dataLength = varIntRead(transactionPacket, offset);
    offset += dataLength.length + dataLength.value;
  }
  if (offset < transactionPacket.length) {
    const loadedAddressLookupTablesCount = byteRead(
      transactionPacket,
      offset++,
    );
    for (let i = 0; i < loadedAddressLookupTablesCount; i++) {
      offset += 32;
      const loadedWritableCount = byteRead(transactionPacket, offset++);
      offset += loadedWritableCount;
      const loadedReadonlyCount = byteRead(transactionPacket, offset++);
      offset += loadedReadonlyCount;
    }
  }
}

function checkSignaturesCount(
  packetSignaturesCount: number,
  messageSignaturesCount: number,
) {
  if (packetSignaturesCount !== messageSignaturesCount) {
    throw new Error(
      `TransactionPacket: Invalid packet: signatures count in header (${packetSignaturesCount}) does not match message (${messageSignaturesCount})`,
    );
  }
}
