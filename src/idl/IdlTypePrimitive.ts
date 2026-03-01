import { withErrorContext } from "../data/Error";
import {
  JsonValue,
  jsonCodecBigInt,
  jsonCodecBoolean,
  jsonCodecNumber,
  jsonCodecPubkey,
} from "../data/Json";
import { pubkeyFromBytes, pubkeyToBytes } from "../data/Pubkey";

/**
 * Represents a primitive scalar type supported by the Anchor IDL
 * (unsigned/signed integers, floats, bool, and pubkey).
 * Pre-built singleton instances are available as static properties.
 */
export class IdlTypePrimitive {
  /** 8-bit unsigned integer (1 byte). */
  public static readonly u8 = new IdlTypePrimitive("u8", 1, 1);
  /** 16-bit unsigned integer (2 bytes, little-endian). */
  public static readonly u16 = new IdlTypePrimitive("u16", 2, 2);
  /** 32-bit unsigned integer (4 bytes, little-endian). */
  public static readonly u32 = new IdlTypePrimitive("u32", 4, 4);
  /** 64-bit unsigned integer (8 bytes, little-endian). */
  public static readonly u64 = new IdlTypePrimitive("u64", 8, 8);
  /** 128-bit unsigned integer (16 bytes, little-endian). */
  public static readonly u128 = new IdlTypePrimitive("u128", 16, 16);
  /** 8-bit signed integer (1 byte). */
  public static readonly i8 = new IdlTypePrimitive("i8", 1, 1);
  /** 16-bit signed integer (2 bytes, little-endian). */
  public static readonly i16 = new IdlTypePrimitive("i16", 2, 2);
  /** 32-bit signed integer (4 bytes, little-endian). */
  public static readonly i32 = new IdlTypePrimitive("i32", 4, 4);
  /** 64-bit signed integer (8 bytes, little-endian). */
  public static readonly i64 = new IdlTypePrimitive("i64", 8, 8);
  /** 128-bit signed integer (16 bytes, little-endian). */
  public static readonly i128 = new IdlTypePrimitive("i128", 16, 16);
  /** 32-bit IEEE 754 float (4 bytes, little-endian). */
  public static readonly f32 = new IdlTypePrimitive("f32", 4, 4);
  /** 64-bit IEEE 754 float (8 bytes, little-endian). */
  public static readonly f64 = new IdlTypePrimitive("f64", 8, 8);
  /** Boolean (1 byte; 0 = false, non-zero = true). */
  public static readonly bool = new IdlTypePrimitive("bool", 1, 1);
  /** Solana public key (32-byte Ed25519 point). */
  public static readonly pubkey = new IdlTypePrimitive("pubkey", 32, 1);

  /** The name of this primitive type (e.g. `"u8"`, `"bool"`, `"pubkey"`). */
  public readonly name: string;
  /** The size in bytes of this primitive type. */
  public readonly size: number;
  /** The required byte alignment of this primitive type. */
  public readonly alignment: number;

  private constructor(name: string, size: number, alignment: number) {
    this.name = name;
    this.size = size;
    this.alignment = alignment;
  }

  /**
   * Dispatches to the matching visitor branch based on this primitive's name.
   * @param visitor - An object with one handler per primitive type.
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
      i8: (p1: P1, p2: P2) => T;
      i16: (p1: P1, p2: P2) => T;
      i32: (p1: P1, p2: P2) => T;
      i64: (p1: P1, p2: P2) => T;
      i128: (p1: P1, p2: P2) => T;
      f32: (p1: P1, p2: P2) => T;
      f64: (p1: P1, p2: P2) => T;
      bool: (p1: P1, p2: P2) => T;
      pubkey: (p1: P1, p2: P2) => T;
    },
    p1: P1,
    p2: P2,
  ): T {
    return visitor[this.name as keyof typeof visitor](p1, p2);
  }
}

/** A read-only map from primitive type name (e.g. `"u8"`, `"pubkey"`) to its {@link IdlTypePrimitive} instance. */
export const idlTypePrimitiveByName: ReadonlyMap<string, IdlTypePrimitive> =
  (() => {
    const primitives = [
      IdlTypePrimitive.u8,
      IdlTypePrimitive.u16,
      IdlTypePrimitive.u32,
      IdlTypePrimitive.u64,
      IdlTypePrimitive.u128,
      IdlTypePrimitive.i8,
      IdlTypePrimitive.i16,
      IdlTypePrimitive.i32,
      IdlTypePrimitive.i64,
      IdlTypePrimitive.i128,
      IdlTypePrimitive.f32,
      IdlTypePrimitive.f64,
      IdlTypePrimitive.bool,
      IdlTypePrimitive.pubkey,
    ];
    const primitivesByName = new Map<string, IdlTypePrimitive>();
    for (const primitive of primitives) {
      primitivesByName.set(primitive.name, primitive);
    }
    return primitivesByName;
  })();

/**
 * Encodes a JSON value into the byte representation of `self`'s primitive type
 * and appends the resulting {@link Uint8Array} to `blobs`.
 * @param self - The {@link IdlTypePrimitive} defining the scalar type to encode.
 * @param value - The JSON-compatible value to encode.
 * @param blobs - The output array to which the encoded bytes are appended.
 */
export function idlTypePrimitiveEncode(
  self: IdlTypePrimitive,
  value: JsonValue,
  blobs: Array<Uint8Array>,
) {
  return withErrorContext(`Encode: ${self.name}`, () => {
    const blob = new Uint8Array(self.size);
    self.traverse(visitorEncode, blob, value);
    blobs.push(blob);
  });
}

/**
 * Decodes a JSON-compatible value from `data` at `dataOffset` according to `self`'s primitive type.
 * @param self - The {@link IdlTypePrimitive} defining the scalar type to decode.
 * @param data - The `DataView` over the raw binary buffer.
 * @param dataOffset - Byte offset within `data` at which to start reading.
 * @returns A tuple of `[bytesConsumed, decodedJsonValue]`.
 */
export function idlTypePrimitiveDecode(
  self: IdlTypePrimitive,
  data: DataView,
  dataOffset: number,
): [number, JsonValue] {
  return [self.size, self.traverse(visitorDecode, data, dataOffset)];
}

const visitorEncode = {
  u8: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonCodecBigInt.decoder(value);
    if (num < 0 || num > 0xffn) {
      throw new Error(`Value out of bounds for u8: ${num}`);
    }
    blob[0] = Number(num);
  },
  u16: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonCodecBigInt.decoder(value);
    if (num < 0 || num > 0xffffn) {
      throw new Error(`Value out of bounds for u16: ${num}`);
    }
    const data = new DataView(blob.buffer);
    data.setUint16(0, Number(num), true);
  },
  u32: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonCodecBigInt.decoder(value);
    if (num < 0 || num > 0xffffffffn) {
      throw new Error(`Value out of bounds for u32: ${num}`);
    }
    const data = new DataView(blob.buffer);
    data.setUint32(0, Number(num), true);
  },
  u64: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonCodecBigInt.decoder(value);
    if (num < 0 || num > 0xffffffffffffffffn) {
      throw new Error(`Value out of bounds for u64: ${num}`);
    }
    const data = new DataView(blob.buffer);
    data.setBigUint64(0, num, true);
  },
  u128: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonCodecBigInt.decoder(value);
    if (num < 0 || num > 0xffffffffffffffffffffffffffffffffn) {
      throw new Error(`Value out of bounds for u128: ${num}`);
    }
    const data = new DataView(blob.buffer);
    data.setBigUint64(0, num, true);
    data.setBigUint64(8, num >> 64n, true);
  },
  i8: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonCodecBigInt.decoder(value);
    if (num < -0x80n || num > 0x7fn) {
      throw new Error(`Value out of bounds for i8: ${num}`);
    }
    const data = new DataView(blob.buffer);
    data.setInt8(0, Number(num));
  },
  i16: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonCodecBigInt.decoder(value);
    if (num < -0x8000n || num > 0x7fff) {
      throw new Error(`Value out of bounds for i16: ${num}`);
    }
    const data = new DataView(blob.buffer);
    data.setInt16(0, Number(num), true);
  },
  i32: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonCodecBigInt.decoder(value);
    if (num < -0x80000000n || num > 0x7fffffff) {
      throw new Error(`Value out of bounds for i32: ${num}`);
    }
    const data = new DataView(blob.buffer);
    data.setInt32(0, Number(num), true);
  },
  i64: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonCodecBigInt.decoder(value);
    if (num < -0x8000000000000000n || num > 0x7fffffffffffffffn) {
      throw new Error(`Value out of bounds for i64: ${num}`);
    }
    const data = new DataView(blob.buffer);
    data.setBigInt64(0, num, true);
  },
  i128: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonCodecBigInt.decoder(value);
    if (
      num < -0x80000000000000000000000000000000n ||
      num > 0x7fffffffffffffffffffffffffffffffn
    ) {
      throw new Error(`Value out of bounds for i128: ${num}`);
    }
    const low = BigInt.asIntN(64, num);
    const high = BigInt.asIntN(64, num >> 64n);
    const data = new DataView(blob.buffer);
    data.setBigInt64(0, low, true);
    data.setBigInt64(8, high, true);
  },
  f32: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonCodecNumber.decoder(value);
    const data = new DataView(blob.buffer);
    data.setFloat32(0, num, true);
  },
  f64: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonCodecNumber.decoder(value);
    const data = new DataView(blob.buffer);
    data.setFloat64(0, num, true);
  },
  bool: (blob: Uint8Array, value: JsonValue) => {
    blob[0] = jsonCodecBoolean.decoder(value) ? 1 : 0;
  },
  pubkey: (blob: Uint8Array, value: JsonValue) => {
    blob.set(pubkeyToBytes(jsonCodecPubkey.decoder(value)));
  },
};

const visitorDecode = {
  u8: (data: DataView, dataOffset: number): JsonValue => {
    return data.getUint8(dataOffset);
  },
  u16: (data: DataView, dataOffset: number): JsonValue => {
    return data.getUint16(dataOffset, true);
  },
  u32: (data: DataView, dataOffset: number): JsonValue => {
    return data.getUint32(dataOffset, true);
  },
  u64: (data: DataView, dataOffset: number): JsonValue => {
    return data.getBigUint64(dataOffset, true).toString();
  },
  u128: (data: DataView, dataOffset: number): JsonValue => {
    const low = data.getBigUint64(dataOffset, true);
    const high = data.getBigUint64(dataOffset + 8, true);
    return (low | (high << 64n)).toString();
  },
  i8: (data: DataView, dataOffset: number): JsonValue => {
    return data.getInt8(dataOffset);
  },
  i16: (data: DataView, dataOffset: number): JsonValue => {
    return data.getInt16(dataOffset, true);
  },
  i32: (data: DataView, dataOffset: number): JsonValue => {
    return data.getInt32(dataOffset, true);
  },
  i64: (data: DataView, dataOffset: number): JsonValue => {
    return data.getBigInt64(dataOffset, true).toString();
  },
  i128: (data: DataView, dataOffset: number): JsonValue => {
    const low = data.getBigUint64(dataOffset, true);
    const high = data.getBigInt64(dataOffset + 8, true);
    return (low | (high << 64n)).toString();
  },
  f32: (data: DataView, dataOffset: number): JsonValue => {
    return data.getFloat32(dataOffset, true);
  },
  f64: (data: DataView, dataOffset: number): JsonValue => {
    return data.getFloat64(dataOffset, true);
  },
  bool: (data: DataView, dataOffset: number): JsonValue => {
    return data.getUint8(dataOffset) != 0;
  },
  pubkey: (data: DataView, dataOffset: number): JsonValue => {
    const bytes = new Uint8Array(data.buffer, dataOffset, 32);
    return jsonCodecPubkey.encoder(pubkeyFromBytes(bytes));
  },
};
