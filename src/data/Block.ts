import { base58Decode, base58Encode } from "./Base58";
import { BrandedType } from "./Utils";

export type BlockSlot = BrandedType<number, "BlockSlot">;
export type BlockHash = BrandedType<string, "BlockHash">;

export function blockSlotFromNumber(value: number): BlockSlot {
  return value as BlockSlot;
}

export function blockSlotToNumber(value: BlockSlot): number {
  return value as number;
}

export const blockHashDefault = blockHashFromBytes(new Uint8Array(32));

export function blockHashFromBase58(base58: string): BlockHash {
  const bytes = base58Decode(base58);
  blockHashBytesCheck(bytes);
  return base58 as BlockHash;
}

export function blockHashFromBytes(bytes: Uint8Array): BlockHash {
  blockHashBytesCheck(bytes);
  const blockHash = base58Encode(bytes);
  return blockHash as BlockHash;
}

export function blockHashToBytes(value: BlockHash): Uint8Array {
  const bytes = base58Decode(value as string);
  blockHashBytesCheck(bytes);
  return bytes;
}

export function blockHashToBase58(value: BlockHash): string {
  return value as string;
}

function blockHashBytesCheck(bytes: Uint8Array): void {
  if (bytes.length !== 32) {
    throw new Error(
      `BlockHash: Expected block hash spanning 32 bytes (found: ${bytes.length})`,
    );
  }
}
