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
import { WalletAccount } from "./Wallet";

/**
 * The inputs required to build a Solana transaction.
 * Contains the fee payer, a recent blockhash for expiry, and the list of
 * instructions to execute.
 */
export type TransactionRequest = {
  payerAddress: Pubkey;
  recentBlockHash: BlockHash;
  instructionsRequests: Array<InstructionRequest>;
};

/**
 * An on-chain address lookup table (ALT) and the subset of its addresses
 * referenced by a versioned transaction.
 */
export type TransactionAddressLookupTable = {
  tableAddress: Pubkey;
  lookupAddresses: Array<Pubkey>;
};

/**
 * The wire-format version of a Solana transaction.
 * `"legacy"` denotes the original format; a numeric value (e.g. `0`) denotes
 * a versioned-transaction format.
 */
export type TransactionVersion = "legacy" | number;

/**
 * The serialized body of a transaction, containing the header, account keys,
 * recent blockhash, and compiled instructions.
 * Represented as a branded `Uint8Array` to prevent accidental misuse.
 */
export type TransactionMessage = Branded<Uint8Array, "TransactionMessage"> & {
  length: number;
};

/**
 * A fully-assembled, wire-ready transaction that includes both the signature
 * slots and the transaction message.
 * Represented as a branded `Uint8Array` to prevent accidental misuse.
 */
export type TransactionPacket = Branded<Uint8Array, "TransactionPacket"> & {
  length: number;
};

/**
 * A function that processes a {@link TransactionPacket}, typically used for
 * post-processing or wallet signing after the initial compilation phase.
 */
export type TransactionProcessor = (
  transactionPacket: TransactionPacket,
) => Promise<TransactionPacket>;

/**
 * An opaque reference to a transaction on-chain, base58-encoded.
 * (Backed by the transaction's first signer signature)
 */
export type TransactionHandle = Branded<string, "TransactionHandle">;

/**
 * Creates a {@link TransactionHandle} from a Base58-encoded string.
 * @param base58 - A 64-byte signature encoded as Base58.
 * @returns The typed {@link TransactionHandle}.
 * @throws {Error} If the decoded bytes are not exactly 64 bytes.
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
 * Returns the Base58 string representation of a {@link TransactionHandle}.
 * @param handle - The {@link TransactionHandle} to convert.
 * @returns The Base58 string representation of the {@link TransactionHandle}.
 */
export function transactionHandleToBase58(handle: TransactionHandle): string {
  return handle as string;
}

/**
 * Creates a {@link TransactionPacket} from a raw byte array, performing a structural check to ensure it is well-formed and can be safely parsed.
 * @param bytes - The raw byte array to convert.
 * @returns The typed {@link TransactionPacket}.
 * @throws {Error} If the byte array is not a valid transaction packet.
 */
export function transactionPacketFromBytes(
  bytes: Uint8Array,
): TransactionPacket {
  const transactionPacket = bytes as TransactionPacket;
  checkPacket(transactionPacket);
  return transactionPacket;
}

/**
 * Returns the raw byte array from a {@link TransactionPacket}.
 * @param transactionPacket - The {@link TransactionPacket} to convert.
 * @returns The raw byte array representation of the {@link TransactionPacket}.
 */
export function transactionPacketToBytes(
  transactionPacket: TransactionPacket,
): Uint8Array {
  return transactionPacket as Uint8Array;
}

/**
 * Compiles a {@link TransactionRequest} into a wire-ready
 * {@link TransactionPacket} and signs it with the provided signers.
 *
 * @param signers - One or more {@link Signer}, {@link WalletAccount}, or {@link TransactionProcessor}
 *   that will sign the transaction.
 * @param transactionRequest - The fee payer, recent blockhash, and
 *   instructions to compile.
 * @param transactionAddressLookupTables - Optional address lookup tables used
 *   to compress account references in versioned transactions.
 * @returns A promise that resolves to the fully signed {@link TransactionPacket}.
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
 * Compiles a {@link TransactionRequest} into an unsigned
 * {@link TransactionPacket} with zeroed-out signature slots.
 *
 * @param transactionRequest - The fee payer, recent blockhash, and
 *   instructions to compile.
 * @param transactionAddressLookupTables - Optional address lookup tables used
 *   to compress account references in versioned transactions.
 * @returns The serialised, unsigned {@link TransactionPacket}.
 * @throws If the resulting packet exceeds the 1232-byte transaction size limit.
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
 * Signs an existing {@link TransactionPacket} with the provided signers,
 * filling in the corresponding signature slots in-place.
 *
 * @param transactionPacket - The unsigned (or partially signed) transaction.
 * @param signers - One or more {@link Signer} or {@link WalletAccount} objects
 *   whose signatures should be applied.
 * @returns A promise that resolves to the updated {@link TransactionPacket}
 *   with all available signatures applied.
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
 * Verifies all signatures present in a {@link TransactionPacket} against its
 * message payload.
 *
 * @param transactionPacket - The signed transaction to verify.
 * @returns A promise that resolves when all signatures are valid.
 * @throws If any signature fails cryptographic verification.
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
 * Extracts the raw {@link TransactionMessage} bytes from a
 * {@link TransactionPacket} by skipping the leading signature slots.
 *
 * @param transactionPacket - The transaction whose message should be extracted.
 * @returns The message portion of the packet as a {@link TransactionMessage}.
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
 * Extracts each signer's address and its corresponding raw signature from a
 * {@link TransactionPacket}.
 *
 * @param transactionPacket - The (partially or fully signed) transaction.
 * @returns An array of `{ signerAddress, signature }` pairs, one per required
 *   signer, in the order they appear in the transaction.
 * @throws If the signature count in the packet header disagrees with the count
 *   encoded in the message header.
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
 * Decompiles a serialised {@link TransactionMessage} back into a
 * {@link TransactionRequest} that can be inspected or re-compiled.
 *
 * @param transactionMessage - The raw message bytes to decompile.
 * @param transactionAddressLookupTables - Optional address lookup tables
 *   required to resolve any loaded accounts referenced by the message.
 * @returns The reconstructed {@link TransactionRequest}.
 * @throws If the message references a lookup table that is not supplied in
 *   `transactionAddressLookupTables`.
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
  offset += instructionCount.size;
  for (let i = 0; i < instructionCount.value; i++) {
    offset++;
    const inputCount = varIntRead(transactionPacket, offset);
    offset += inputCount.size + inputCount.value;
    const dataLength = varIntRead(transactionPacket, offset);
    offset += dataLength.size + dataLength.value;
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
