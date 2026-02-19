import { base58Decode, base58Encode } from "./Base58";
import { Branded } from "./Utils";

export type BlockSlot = Branded<number, "BlockSlot">;
export type BlockHash = Branded<string, "BlockHash">;

/** Creates a typed BlockSlot from a raw number. */
export function blockSlotFromNumber(value: number): BlockSlot {
  return value as BlockSlot;
}

/** Converts a BlockSlot to a raw number. */
export function blockSlotToNumber(self: BlockSlot): number {
  return self as number;
}

export const blockHashDefault = blockHashFromBytes(new Uint8Array(32));

/** Creates a BlockHash from a Base58-encoded string, validating that it is 32 bytes. */
export function blockHashFromBase58(base58: string): BlockHash {
  const bytes = base58Decode(base58);
  blockHashBytesCheck(bytes);
  return base58 as BlockHash;
}

/** Creates a BlockHash from a 32-byte array. */
export function blockHashFromBytes(bytes: Uint8Array): BlockHash {
  blockHashBytesCheck(bytes);
  const blockHash = base58Encode(bytes);
  return blockHash as BlockHash;
}

/** Converts a BlockHash to its underlying 32-byte array. */
export function blockHashToBytes(self: BlockHash): Uint8Array {
  const bytes = base58Decode(self as string);
  blockHashBytesCheck(bytes);
  return bytes;
}

/** Converts a BlockHash to its Base58 string representation. */
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
