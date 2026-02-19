/**
 * Represents an unsigned integer prefix type used to encode the length or
 * discriminant of variable-size fields (e.g. vec, string, option).
 * The five singleton instances cover u8 through u128.
 */
export class IdlTypePrefix {
  /** 1-byte unsigned prefix (u8). */
  public static readonly u8 = new IdlTypePrefix("u8", 1);
  /** 2-byte unsigned prefix (u16, little-endian). */
  public static readonly u16 = new IdlTypePrefix("u16", 2);
  /** 4-byte unsigned prefix (u32, little-endian). */
  public static readonly u32 = new IdlTypePrefix("u32", 4);
  /** 8-byte unsigned prefix (u64, little-endian). */
  public static readonly u64 = new IdlTypePrefix("u64", 8);
  /** 16-byte unsigned prefix (u128, little-endian). */
  public static readonly u128 = new IdlTypePrefix("u128", 16);

  /** The name of this prefix type (e.g. `"u8"`, `"u32"`). */
  public readonly name: string;
  /** The byte width of this prefix. */
  public readonly size: number;

  private constructor(name: string, size: number) {
    this.name = name;
    this.size = size;
  }

  /**
   * Dispatches to the matching visitor branch based on this prefix's integer width.
   * @param visitor - An object with one handler per prefix size (u8/u16/u32/u64/u128).
   * @param p1 - First context parameter forwarded to the visitor.
   * @param p2 - Second context parameter forwarded to the visitor.
   * @returns The value returned by the matched visitor branch.
   */
  public traverse<P1, P2, T>(
    visitor: {
      u8: (p1: P1, p2: P2) => T;
      u16: (p1: P1, p2: P2) => T;
      u32: (p1: P1, p2: P2) => T;
      u64: (p1: P1, p2: P2) => T;
      u128: (p1: P1, p2: P2) => T;
    },
    p1: P1,
    p2: P2,
  ): T {
    return visitor[this.name as keyof typeof visitor](p1, p2);
  }
}

/**
 * Encodes a `bigint` value into the byte representation determined by `self`'s width
 * and appends the resulting {@link Uint8Array} to `blobs`.
 */
export function idlTypePrefixEncode(
  self: IdlTypePrefix,
  value: bigint,
  blobs: Array<Uint8Array>,
) {
  const blob = new Uint8Array(self.size);
  self.traverse(visitorEncode, blob, value);
  blobs.push(blob);
}

/**
 * Decodes a `bigint` value from `data` at `dataOffset` using `self`'s byte width.
 * @returns A tuple of `[bytesConsumed, decodedValue]`.
 */
export function idlTypePrefixDecode(
  self: IdlTypePrefix,
  data: DataView,
  dataOffset: number,
): [number, bigint] {
  return [self.size, self.traverse(visitorDecode, data, dataOffset)];
}

const visitorEncode = {
  u8: (blob: Uint8Array, value: bigint) => {
    if (value < 0n || value > 0xffn) {
      throw new Error(`Value out of bounds for u8: ${value}`);
    }
    blob[0] = Number(value);
  },
  u16: (blob: Uint8Array, value: bigint) => {
    if (value < 0n || value > 0xffffn) {
      throw new Error(`Value out of bounds for u16: ${value}`);
    }
    const data = new DataView(blob.buffer);
    data.setUint16(0, Number(value), true);
  },
  u32: (blob: Uint8Array, value: bigint) => {
    if (value < 0n || value > 0xffffffffn) {
      throw new Error(`Value out of bounds for u32: ${value}`);
    }
    const data = new DataView(blob.buffer);
    data.setUint32(0, Number(value), true);
  },
  u64: (blob: Uint8Array, value: bigint) => {
    if (value < 0n || value > 0xffffffffffffffffn) {
      throw new Error(`Value out of bounds for u64: ${value}`);
    }
    const data = new DataView(blob.buffer);
    data.setBigUint64(0, value, true);
  },
  u128: (blob: Uint8Array, value: bigint) => {
    if (value < 0n || value > 0xffffffffffffffffffffffffffffffffn) {
      throw new Error(`Value out of bounds for u128: ${value}`);
    }
    const data = new DataView(blob.buffer);
    data.setBigUint64(0, value, true);
    data.setBigUint64(8, value >> 64n, true);
  },
};

const visitorDecode = {
  u8: (data: DataView, dataOffset: number) => {
    return BigInt(data.getUint8(dataOffset));
  },
  u16: (data: DataView, dataOffset: number) => {
    return BigInt(data.getUint16(dataOffset, true));
  },
  u32: (data: DataView, dataOffset: number) => {
    return BigInt(data.getUint32(dataOffset, true));
  },
  u64: (data: DataView, dataOffset: number) => {
    return data.getBigUint64(dataOffset, true);
  },
  u128: (data: DataView, dataOffset: number) => {
    const low = data.getBigUint64(dataOffset, true);
    const high = data.getBigUint64(dataOffset + 8, true);
    return low | (high << 64n);
  },
};
