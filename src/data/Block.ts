import { base58Decode, base58Encode } from "./Base58";
import { Branded } from "./Utils";

/** A branded number representing a Solana slot (block height). */
export type BlockSlot = Branded<number, "BlockSlot">;
/** A branded string representing a Solana block hash (32-byte Base58-encoded value). */
export type BlockHash = Branded<string, "BlockHash">;

/**
 * Creates a {@link BlockSlot} from a plain number.
 * @param value - The slot number.
 * @returns The typed {@link BlockSlot}.
 */
export function blockSlotFromNumber(value: number): BlockSlot {
  return value as BlockSlot;
}

/**
 * Converts a {@link BlockSlot} back to a plain number.
 * @param self - The block slot.
 * @returns The underlying slot number.
 */
export function blockSlotToNumber(self: BlockSlot): number {
  return self as number;
}

/** The default (all-zeroes) block hash. */
export const blockHashDefault = blockHashFromBytes(new Uint8Array(32));

/**
 * Creates a {@link BlockHash} from a Base58-encoded string.
 * @param base58 - A 32-byte block hash encoded as Base58.
 * @returns The typed {@link BlockHash}.
 * @throws {Error} If the decoded bytes are not exactly 32 bytes.
 */
export function blockHashFromBase58(base58: string): BlockHash {
  const bytes = base58Decode(base58);
  blockHashBytesCheck(bytes);
  return base58 as BlockHash;
}

/**
 * Creates a {@link BlockHash} from a raw byte array.
 * @param bytes - Exactly 32 bytes representing the block hash.
 * @returns The typed {@link BlockHash} as a Base58 string.
 * @throws {Error} If `bytes` is not exactly 32 bytes.
 */
export function blockHashFromBytes(bytes: Uint8Array): BlockHash {
  blockHashBytesCheck(bytes);
  const blockHash = base58Encode(bytes);
  return blockHash as BlockHash;
}

/**
 * Decodes a {@link BlockHash} into its raw 32-byte representation.
 * @param self - The block hash to decode.
 * @returns A 32-byte `Uint8Array`.
 * @throws {Error} If the decoded bytes are not exactly 32 bytes.
 */
export function blockHashToBytes(self: BlockHash): Uint8Array {
  const bytes = base58Decode(self as string);
  blockHashBytesCheck(bytes);
  return bytes;
}

/**
 * Returns the Base58 string representation of a {@link BlockHash}.
 * @param self - The block hash.
 * @returns The Base58-encoded string.
 */
export function blockHashToBase58(self: BlockHash): string {
  return self as string;
}

function blockHashBytesCheck(bytes: Uint8Array): void {
  if (bytes.length !== 32) {
    throw new Error(
      `BlockHash: Expected block hash spanning 32 bytes (found: ${bytes.length})`,
    );
  }
}
