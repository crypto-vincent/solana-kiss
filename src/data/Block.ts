import { base58BytesLength, base58Decode, base58Encode } from "./Base58";
import { Branded } from "./Utils";

/** A branded number representing a Solana slot (block height). */
export type BlockSlot = Branded<number, "BlockSlot">;
/** A branded string representing a Solana block hash (32-byte Base58-encoded value). */
export type BlockHash = Branded<string, "BlockHash">;

/**
 * Creates a {@link BlockSlot} from a number.
 * @param value - Slot number.
 * @returns Typed {@link BlockSlot}.
 */
export function blockSlotFromNumber(value: number): BlockSlot {
  return value as BlockSlot;
}

/**
 * Converts a {@link BlockSlot} to a plain number.
 * @param self - Block slot.
 * @returns Slot number.
 */
export function blockSlotToNumber(self: BlockSlot): number {
  return self as number;
}

/** The default (all-zeroes) block hash. */
export const blockHashDefault = blockHashFromBytes(new Uint8Array(32));

/**
 * Creates a {@link BlockHash} from a Base58 string.
 * @param base58 - 32-byte block hash as Base58.
 * @returns Typed {@link BlockHash}.
 * @throws If decoded bytes are not 32 bytes.
 */
export function blockHashFromBase58(base58: string): BlockHash {
  blockHashBytesLengthCheck(base58BytesLength(base58));
  return base58 as BlockHash;
}

/**
 * Creates a {@link BlockHash} from 32 bytes.
 * @param bytes - Exactly 32 bytes.
 * @returns Typed {@link BlockHash} as Base58.
 * @throws If not exactly 32 bytes.
 */
export function blockHashFromBytes(bytes: Uint8Array): BlockHash {
  blockHashBytesLengthCheck(bytes.length);
  return base58Encode(bytes) as BlockHash;
}

/**
 * Decodes a {@link BlockHash} to raw bytes.
 * @param self - Block hash.
 * @returns 32-byte `Uint8Array`.
 * @throws If decoded bytes are not 32 bytes.
 */
export function blockHashToBytes(self: BlockHash): Uint8Array {
  return base58Decode(self as string);
}

/**
 * Returns the Base58 string of a {@link BlockHash}.
 * @param self - Block hash.
 * @returns Base58 string.
 */
export function blockHashToBase58(self: BlockHash): string {
  return self as string;
}

function blockHashBytesLengthCheck(bytesLength: number): void {
  if (bytesLength !== 32) {
    throw new Error(`BlockHash: Expected 32 bytes (found: ${bytesLength})`);
  }
}
