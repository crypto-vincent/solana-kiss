import { withErrorContext } from "../data/Error";
import {
  JsonValue,
  jsonCodecBigInt,
  jsonCodecBoolean,
  jsonCodecNumber,
  jsonCodecPubkey,
} from "../data/Json";
import { pubkeyFromBytes, pubkeyToBytes } from "../data/Pubkey";

/** Primitive scalar type supported for encoding/decoding. */
export type IdlTypePrimitive =
  | "u8"
  | "u16"
  | "u32"
  | "u64"
  | "u128"
  | "i8"
  | "i16"
  | "i32"
  | "i64"
  | "i128"
  | "f32"
  | "f64"
  | "bool"
  | "pubkey";

/**
 * Encodes a JSON value into the byte representation of `self`'s primitive type, appending to `blobs`.
 * @param self - Primitive type to encode.
 * @param value - Value to encode.
 * @param blobs - Output byte array collection.
 */
export function idlTypePrimitiveEncode(
  self: IdlTypePrimitive,
  value: JsonValue,
  blobs: Array<Uint8Array>,
) {
  return withErrorContext(`Encode: ${self}`, () => {
    visitorEncode[self](value, blobs);
  });
}

/**
 * Decodes a JSON value from `data` at `dataOffset` using `self`'s primitive type.
 * @param self - Primitive type to decode.
 * @param data - Raw binary `DataView`.
 * @param dataOffset - Byte offset.
 * @returns `[bytesConsumed, decodedJsonValue]`.
 */
export function idlTypePrimitiveDecode(
  self: IdlTypePrimitive,
  data: DataView,
  dataOffset: number,
): [number, JsonValue] {
  return visitorDecode[self](data, dataOffset);
}

const visitorEncode: {
  [K in IdlTypePrimitive]: (value: JsonValue, blobs: Array<Uint8Array>) => void;
} = {
  u8: (value: JsonValue, blobs: Array<Uint8Array>) => {
    const num = jsonCodecBigInt.decoder(value);
    if (num < 0 || num > 0xffn) {
      throw new Error(`Value out of bounds for u8: ${num}`);
    }
    const blob = new Uint8Array(1);
    blob[0] = Number(num);
    blobs.push(blob);
  },
  u16: (value: JsonValue, blobs: Array<Uint8Array>) => {
    const num = jsonCodecBigInt.decoder(value);
    if (num < 0 || num > 0xffffn) {
      throw new Error(`Value out of bounds for u16: ${num}`);
    }
    const blob = new Uint8Array(2);
    const data = new DataView(blob.buffer);
    data.setUint16(0, Number(num), true);
    blobs.push(blob);
  },
  u32: (value: JsonValue, blobs: Array<Uint8Array>) => {
    const num = jsonCodecBigInt.decoder(value);
    if (num < 0 || num > 0xffffffffn) {
      throw new Error(`Value out of bounds for u32: ${num}`);
    }
    const blob = new Uint8Array(4);
    const data = new DataView(blob.buffer);
    data.setUint32(0, Number(num), true);
    blobs.push(blob);
  },
  u64: (value: JsonValue, blobs: Array<Uint8Array>) => {
    const num = jsonCodecBigInt.decoder(value);
    if (num < 0 || num > 0xffffffffffffffffn) {
      throw new Error(`Value out of bounds for u64: ${num}`);
    }
    const blob = new Uint8Array(8);
    const data = new DataView(blob.buffer);
    data.setBigUint64(0, num, true);
    blobs.push(blob);
  },
  u128: (value: JsonValue, blobs: Array<Uint8Array>) => {
    const num = jsonCodecBigInt.decoder(value);
    if (num < 0 || num > 0xffffffffffffffffffffffffffffffffn) {
      throw new Error(`Value out of bounds for u128: ${num}`);
    }
    const blob = new Uint8Array(16);
    const data = new DataView(blob.buffer);
    data.setBigUint64(0, num, true);
    data.setBigUint64(8, num >> 64n, true);
    blobs.push(blob);
  },
  i8: (value: JsonValue, blobs: Array<Uint8Array>) => {
    const num = jsonCodecBigInt.decoder(value);
    if (num < -0x80n || num > 0x7fn) {
      throw new Error(`Value out of bounds for i8: ${num}`);
    }
    const blob = new Uint8Array(1);
    const data = new DataView(blob.buffer);
    data.setInt8(0, Number(num));
    blobs.push(blob);
  },
  i16: (value: JsonValue, blobs: Array<Uint8Array>) => {
    const num = jsonCodecBigInt.decoder(value);
    if (num < -0x8000n || num > 0x7fff) {
      throw new Error(`Value out of bounds for i16: ${num}`);
    }
    const blob = new Uint8Array(2);
    const data = new DataView(blob.buffer);
    data.setInt16(0, Number(num), true);
    blobs.push(blob);
  },
  i32: (value: JsonValue, blobs: Array<Uint8Array>) => {
    const num = jsonCodecBigInt.decoder(value);
    if (num < -0x80000000n || num > 0x7fffffff) {
      throw new Error(`Value out of bounds for i32: ${num}`);
    }
    const blob = new Uint8Array(4);
    const data = new DataView(blob.buffer);
    data.setInt32(0, Number(num), true);
    blobs.push(blob);
  },
  i64: (value: JsonValue, blobs: Array<Uint8Array>) => {
    const num = jsonCodecBigInt.decoder(value);
    if (num < -0x8000000000000000n || num > 0x7fffffffffffffffn) {
      throw new Error(`Value out of bounds for i64: ${num}`);
    }
    const blob = new Uint8Array(8);
    const data = new DataView(blob.buffer);
    data.setBigInt64(0, num, true);
    blobs.push(blob);
  },
  i128: (value: JsonValue, blobs: Array<Uint8Array>) => {
    const num = jsonCodecBigInt.decoder(value);
    if (
      num < -0x80000000000000000000000000000000n ||
      num > 0x7fffffffffffffffffffffffffffffffn
    ) {
      throw new Error(`Value out of bounds for i128: ${num}`);
    }
    const low = BigInt.asIntN(64, num);
    const high = BigInt.asIntN(64, num >> 64n);
    const blob = new Uint8Array(16);
    const data = new DataView(blob.buffer);
    data.setBigInt64(0, low, true);
    data.setBigInt64(8, high, true);
    blobs.push(blob);
  },
  f32: (value: JsonValue, blobs: Array<Uint8Array>) => {
    const num = jsonCodecNumber.decoder(value);
    const blob = new Uint8Array(4);
    const data = new DataView(blob.buffer);
    data.setFloat32(0, num, true);
    blobs.push(blob);
  },
  f64: (value: JsonValue, blobs: Array<Uint8Array>) => {
    const num = jsonCodecNumber.decoder(value);
    const blob = new Uint8Array(8);
    const data = new DataView(blob.buffer);
    data.setFloat64(0, num, true);
    blobs.push(blob);
  },
  bool: (value: JsonValue, blobs: Array<Uint8Array>) => {
    const blob = new Uint8Array(1);
    blob[0] = jsonCodecBoolean.decoder(value) ? 1 : 0;
    blobs.push(blob);
  },
  pubkey: (value: JsonValue, blobs: Array<Uint8Array>) => {
    blobs.push(pubkeyToBytes(jsonCodecPubkey.decoder(value)));
  },
};

const visitorDecode: {
  [K in IdlTypePrimitive]: (
    data: DataView,
    dataOffset: number,
  ) => [number, JsonValue];
} = {
  u8: (data: DataView, dataOffset: number) => {
    return [1, jsonCodecNumber.encoder(data.getUint8(dataOffset))];
  },
  u16: (data: DataView, dataOffset: number) => {
    return [2, jsonCodecNumber.encoder(data.getUint16(dataOffset, true))];
  },
  u32: (data: DataView, dataOffset: number) => {
    return [4, jsonCodecNumber.encoder(data.getUint32(dataOffset, true))];
  },
  u64: (data: DataView, dataOffset: number) => {
    return [8, jsonCodecBigInt.encoder(data.getBigUint64(dataOffset, true))];
  },
  u128: (data: DataView, dataOffset: number) => {
    const low = data.getBigUint64(dataOffset, true);
    const high = data.getBigUint64(dataOffset + 8, true);
    return [16, jsonCodecBigInt.encoder(low | (high << 64n))];
  },
  i8: (data: DataView, dataOffset: number) => {
    return [1, jsonCodecNumber.encoder(data.getInt8(dataOffset))];
  },
  i16: (data: DataView, dataOffset: number) => {
    return [2, jsonCodecNumber.encoder(data.getInt16(dataOffset, true))];
  },
  i32: (data: DataView, dataOffset: number) => {
    return [4, jsonCodecNumber.encoder(data.getInt32(dataOffset, true))];
  },
  i64: (data: DataView, dataOffset: number) => {
    return [8, jsonCodecBigInt.encoder(data.getBigInt64(dataOffset, true))];
  },
  i128: (data: DataView, dataOffset: number) => {
    const low = data.getBigUint64(dataOffset, true);
    const high = data.getBigInt64(dataOffset + 8, true);
    return [16, jsonCodecBigInt.encoder(low | (high << 64n))];
  },
  f32: (data: DataView, dataOffset: number) => {
    return [4, jsonCodecNumber.encoder(data.getFloat32(dataOffset, true))];
  },
  f64: (data: DataView, dataOffset: number) => {
    return [8, jsonCodecNumber.encoder(data.getFloat64(dataOffset, true))];
  },
  bool: (data: DataView, dataOffset: number) => {
    return [1, jsonCodecBoolean.encoder(data.getUint8(dataOffset) != 0)];
  },
  pubkey: (data: DataView, dataOffset: number) => {
    const bytes = new Uint8Array(data.buffer, dataOffset, 32);
    return [32, jsonCodecPubkey.encoder(pubkeyFromBytes(bytes))];
  },
};
