/** Unsigned integer prefix for encoding length or discriminant of variable-size fields. */
export type IdlTypePrefix = "u0" | "u8" | "u16" | "u32" | "u64" | "u128";

/**
 * Encodes a `bigint` value using `self`'s width and appends it to `blobs`.
 * @param self - Prefix defining byte width.
 * @param value - Value to encode.
 * @param blobs - Output array to append bytes to.
 */
export function idlTypePrefixEncode(
  self: IdlTypePrefix,
  value: bigint,
  blobs: Array<Uint8Array>,
) {
  visitorEncode[self](value, blobs);
}

/**
 * Decodes a `bigint` from `data` at `dataOffset` using `self`'s byte width.
 * @param self - Prefix defining byte width.
 * @param data - Raw binary buffer.
 * @param dataOffset - Byte offset to start reading.
 * @returns Tuple of `[bytesConsumed, decodedValue]`.
 */
export function idlTypePrefixDecode(
  self: IdlTypePrefix,
  data: DataView,
  dataOffset: number,
): [number, bigint] {
  return visitorDecode[self](data, dataOffset);
}

/** Default prefix for `option` types. */
export const idlTypePrefixDefaultOption = "u8";
/** Default prefix for `vec` types. */
export const idlTypePrefixDefaultVec = "u32";
/** Default prefix for `string` types. */
export const idlTypePrefixDefaultString = "u32";
/** Default prefix for `enum` types. */
export const idlTypePrefixDefaultEnum = "u8";

const visitorEncode: {
  [K in IdlTypePrefix]: (value: bigint, blobs: Array<Uint8Array>) => void;
} = {
  u0: (value: bigint) => {
    if (value < 0n) {
      throw new Error(`Value out of bounds for u0: ${value}`);
    }
  },
  u8: (value: bigint, blobs: Array<Uint8Array>) => {
    if (value < 0n || value > 0xffn) {
      throw new Error(`Value out of bounds for u8: ${value}`);
    }
    const blob = new Uint8Array(1);
    blob[0] = Number(value);
    blobs.push(blob);
  },
  u16: (value: bigint, blobs: Array<Uint8Array>) => {
    if (value < 0n || value > 0xffffn) {
      throw new Error(`Value out of bounds for u16: ${value}`);
    }
    const blob = new Uint8Array(2);
    const data = new DataView(blob.buffer);
    data.setUint16(0, Number(value), true);
    blobs.push(blob);
  },
  u32: (value: bigint, blobs: Array<Uint8Array>) => {
    if (value < 0n || value > 0xffffffffn) {
      throw new Error(`Value out of bounds for u32: ${value}`);
    }
    const blob = new Uint8Array(4);
    const data = new DataView(blob.buffer);
    data.setUint32(0, Number(value), true);
    blobs.push(blob);
  },
  u64: (value: bigint, blobs: Array<Uint8Array>) => {
    if (value < 0n || value > 0xffffffffffffffffn) {
      throw new Error(`Value out of bounds for u64: ${value}`);
    }
    const blob = new Uint8Array(8);
    const data = new DataView(blob.buffer);
    data.setBigUint64(0, value, true);
    blobs.push(blob);
  },
  u128: (value: bigint, blobs: Array<Uint8Array>) => {
    if (value < 0n || value > 0xffffffffffffffffffffffffffffffffn) {
      throw new Error(`Value out of bounds for u128: ${value}`);
    }
    const blob = new Uint8Array(16);
    const data = new DataView(blob.buffer);
    data.setBigUint64(0, value, true);
    data.setBigUint64(8, value >> 64n, true);
    blobs.push(blob);
  },
};

const visitorDecode: {
  [K in IdlTypePrefix]: (data: DataView, offset: number) => [number, bigint];
} = {
  u0: () => {
    throw new Error("Cannot decode u0 prefix");
  },
  u8: (data: DataView, offset: number) => {
    return [1, BigInt(data.getUint8(offset))];
  },
  u16: (data: DataView, offset: number) => {
    return [2, BigInt(data.getUint16(offset, true))];
  },
  u32: (data: DataView, offset: number) => {
    return [4, BigInt(data.getUint32(offset, true))];
  },
  u64: (data: DataView, offset: number) => {
    return [8, data.getBigUint64(offset, true)];
  },
  u128: (data: DataView, offset: number) => {
    const low = data.getBigUint64(offset, true);
    const high = data.getBigUint64(offset + 8, true);
    return [16, low | (high << 64n)];
  },
};
