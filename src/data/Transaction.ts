import { BlockHash, blockHashToBytes, BlockSlot } from "./Block";
import { Instruction } from "./Instruction";
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

export type TransactionRequest = {
  payerAddress: Pubkey;
  recentBlockHash: BlockHash;
  instructions: Array<Instruction>;
};

export type TransactionMessage = BrandedType<Uint8Array, "TransactionMessage">;
export type TransactionPacket = BrandedType<Uint8Array, "TransactionPacket">;

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

export type TransactionCallStack = Array<
  | { invoke: TransactionInvocation }
  | { data: Uint8Array }
  | { log: string }
  | { unknown: string }
>;
export type TransactionInvocation = {
  instruction: Instruction;
  callStack: TransactionCallStack;
  error: string | undefined;
  returnData: Uint8Array | undefined;
  consumedComputeUnits: number | undefined;
};

export async function transactionCompileAndSign(
  signers: Array<Signer>,
  transactionRequest: TransactionRequest,
  addressLookupTables?: Array<any>, // TODO (ALT) - handle LUTs
): Promise<TransactionPacket> {
  const transactionPacket = transactionCompileOnly(
    transactionRequest,
    addressLookupTables,
  );
  await transactionSign(transactionPacket, signers);
  return transactionPacket;
}

export function transactionCompileOnly(
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
  const signatureCount = writableSigners.length + readonlySigners.length;
  const packetBytes = new Array<number>();
  packetBytes.push(signatureCount);
  for (
    let signaturesByteIndex = 0;
    signaturesByteIndex < signatureCount * 64;
    signaturesByteIndex++
  ) {
    packetBytes.push(0);
  }
  if (addressLookupTables !== undefined) {
    packetBytes.push(0x80);
  }
  packetBytes.push(signatureCount);
  packetBytes.push(readonlySigners.length);
  packetBytes.push(readonlyNonSigners.length);
  packetBytes.push(staticAddresses.length);
  for (const staticAddress of staticAddresses) {
    const staticAddressBytes = pubkeyToBytes(staticAddress);
    for (const staticAddressByte of staticAddressBytes) {
      packetBytes.push(staticAddressByte);
    }
  }
  const recentBlockHashBytes = blockHashToBytes(
    transactionRequest.recentBlockHash,
  );
  for (const recentBlockHashByte of recentBlockHashBytes) {
    packetBytes.push(recentBlockHashByte);
  }
  bytesPushShortVec16(packetBytes, transactionRequest.instructions.length);
  for (const instruction of transactionRequest.instructions) {
    const programIndex = staticIndexByAddress.get(instruction.programAddress);
    if (programIndex === undefined) {
      throw new Error(
        `Transaction: Could not find program address in static addresses: ${instruction.programAddress}`,
      );
    }
    packetBytes.push(programIndex);
    packetBytes.push(instruction.inputs.length);
    for (const input of instruction.inputs) {
      const inputIndex = staticIndexByAddress.get(input.address);
      if (inputIndex === undefined) {
        throw new Error(
          `Transaction: Could not find input address in static addresses: ${input.address}`,
        );
      }
      packetBytes.push(inputIndex);
    }
    bytesPushShortVec16(packetBytes, instruction.data.length);
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

export function transactionInspect(transactionPacket: TransactionPacket): {
  transactionVersion: "legacy" | number;
  transactionMessage: TransactionMessage;
  transactionSignersAddresses: Array<Pubkey>;
} {
  const packetBytes = transactionPacket as Uint8Array;
  if (packetBytes.length === 0) {
    throw new Error("Transaction: Cannot get version of an empty message");
  }
  const signatureCount = packetBytes[0]!;
  const messageOffset = 1 + signatureCount * 64;
  if (packetBytes.length <= messageOffset) {
    throw new Error(
      `Transaction: Expected valid packet with ${signatureCount} signatures (found ${packetBytes.length} bytes)`,
    );
  }
  const messageBytes = packetBytes.slice(messageOffset);
  let version: "legacy" | number = "legacy";
  const firstMessageByte = messageBytes[0]!;
  if ((firstMessageByte & 0b10000000) !== 0) {
    version = firstMessageByte & 0b01111111;
  }
  const signersOffset = (version === "legacy" ? 0 : 1) + 4;
  if (messageBytes.length <= signersOffset + signatureCount * 32) {
    throw new Error(
      `Transaction: Expected valid message with at least ${signatureCount} signers (found ${messageBytes.length} bytes)`,
    );
  }
  let signersAddresses = new Array<Pubkey>();
  for (let signerIndex = 0; signerIndex < signatureCount; signerIndex++) {
    const signatureOffset = signersOffset + signerIndex * 32;
    const signerBytes = messageBytes.slice(
      signatureOffset,
      signatureOffset + 32,
    );
    signersAddresses.push(pubkeyFromBytes(signerBytes));
  }
  return {
    transactionVersion: version,
    transactionMessage: messageBytes as TransactionMessage,
    transactionSignersAddresses: signersAddresses,
  };
}

export async function transactionSign(
  transactionPacket: TransactionPacket,
  signers: Array<Signer>,
) {
  const { transactionMessage, transactionSignersAddresses } =
    transactionInspect(transactionPacket);
  const signaturesBySignerAddress = new Map<Pubkey, Signature>();
  for (const signer of signers) {
    signaturesBySignerAddress.set(
      signer.address,
      await signer.sign(transactionMessage),
    );
  }
  const packetBytes = transactionPacket as Uint8Array;
  for (
    let signerIndex = 0;
    signerIndex < transactionSignersAddresses.length;
    signerIndex++
  ) {
    const signerAddress = transactionSignersAddresses[signerIndex]!;
    const signature = signaturesBySignerAddress.get(signerAddress);
    if (signature !== undefined) {
      packetBytes.set(signatureToBytes(signature), 1 + signerIndex * 64);
    }
  }
}

export async function transactionVerify(transactionPacket: TransactionPacket) {
  const { transactionMessage, transactionSignersAddresses } =
    transactionInspect(transactionPacket);
  const packetBytes = transactionPacket as Uint8Array;
  for (
    let signerIndex = 0;
    signerIndex < transactionSignersAddresses.length;
    signerIndex++
  ) {
    const signerAddress = transactionSignersAddresses[signerIndex]!;
    const signatureOffset = 1 + signerIndex * 64;
    const signatureBytes = packetBytes.slice(
      signatureOffset,
      signatureOffset + 64,
    );
    const signature = signatureFromBytes(signatureBytes);
    const verifier = await pubkeyToVerifier(signerAddress);
    const verified = await verifier(signature, transactionMessage);
    if (!verified) {
      throw new Error(
        `Transaction: Signature verification failed for signer: ${signerAddress}`,
      );
    }
  }
}

function bytesPushShortVec16(bytes: Array<number>, length: number) {
  if (length < 0) {
    throw new Error(`Transaction: Expected valid length (found: ${length})`);
  }
  if (length < 128) {
    bytes.push(length);
    return;
  }
  bytes.push((length & 0x7f) | 0x80);
  bytes.push(length >> 7);
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
