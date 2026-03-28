import { withErrorContext } from "../data/Error";
import {
  JsonValue,
  jsonCodecBigInt,
  jsonCodecBoolean,
  jsonCodecNumber,
  jsonCodecPubkey,
} from "../data/Json";
import { pubkeyFromBytes, pubkeyToBytes } from "../data/Pubkey";
import { varIntDecode, varIntEncode } from "../data/VarInt";

/** Primitive scalar type supported for encoding/decoding. */
export type IdlTypePrimitive =
  | "uVar"
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
 * Decodes a JSON value from `data` at `offset` using `self`'s primitive type.
 * @param self - Primitive type to decode.
 * @param data - Raw binary `DataView`.
 * @param offset - Byte offset.
 * @returns `[bytesConsumed, decodedJsonValue]`.
 */
export function idlTypePrimitiveDecode(
  self: IdlTypePrimitive,
  data: DataView,
  offset: number,
): [number, JsonValue] {
  return visitorDecode[self](data, offset);
}

const visitorEncode: {
  [K in IdlTypePrimitive]: (value: JsonValue, blobs: Array<Uint8Array>) => void;
} = {
  uVar: (value: JsonValue, blobs: Array<Uint8Array>) => {
    const num = jsonCodecBigInt.decoder(value);
    if (num < 0n) {
      throw new Error(`Value out of bounds for uVar: ${num}`);
    }
    blobs.push(varIntEncode(num));
  },
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
    offset: number,
  ) => [number, JsonValue];
} = {
  uVar: (data: DataView, offset: number) => {
    const [length, value] = varIntDecode(byteGetter, data, offset);
    return [length, jsonCodecBigInt.encoder(value)];
  },
  u8: (data: DataView, offset: number) => {
    return [1, jsonCodecNumber.encoder(data.getUint8(offset))];
  },
  u16: (data: DataView, offset: number) => {
    return [2, jsonCodecNumber.encoder(data.getUint16(offset, true))];
  },
  u32: (data: DataView, offset: number) => {
    return [4, jsonCodecNumber.encoder(data.getUint32(offset, true))];
  },
  u64: (data: DataView, offset: number) => {
    return [8, jsonCodecBigInt.encoder(data.getBigUint64(offset, true))];
  },
  u128: (data: DataView, offset: number) => {
    const low = data.getBigUint64(offset, true);
    const high = data.getBigUint64(offset + 8, true);
    return [16, jsonCodecBigInt.encoder(low | (high << 64n))];
  },
  i8: (data: DataView, offset: number) => {
    return [1, jsonCodecNumber.encoder(data.getInt8(offset))];
  },
  i16: (data: DataView, offset: number) => {
    return [2, jsonCodecNumber.encoder(data.getInt16(offset, true))];
  },
  i32: (data: DataView, offset: number) => {
    return [4, jsonCodecNumber.encoder(data.getInt32(offset, true))];
  },
  i64: (data: DataView, offset: number) => {
    return [8, jsonCodecBigInt.encoder(data.getBigInt64(offset, true))];
  },
  i128: (data: DataView, offset: number) => {
    const low = data.getBigUint64(offset, true);
    const high = data.getBigInt64(offset + 8, true);
    return [16, jsonCodecBigInt.encoder(low | (high << 64n))];
  },
  f32: (data: DataView, offset: number) => {
    return [4, jsonCodecNumber.encoder(data.getFloat32(offset, true))];
  },
  f64: (data: DataView, offset: number) => {
    return [8, jsonCodecNumber.encoder(data.getFloat64(offset, true))];
  },
  bool: (data: DataView, offset: number) => {
    return [1, jsonCodecBoolean.encoder(data.getUint8(offset) != 0)];
  },
  pubkey: (data: DataView, offset: number) => {
    const bytes = new Uint8Array(data.buffer, offset, 32);
    return [32, jsonCodecPubkey.encoder(pubkeyFromBytes(bytes))];
  },
};

function byteGetter(data: DataView, offset: number) {
  return data.getUint8(offset);
}
