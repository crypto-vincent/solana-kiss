import {
  JsonValue,
  jsonCodecBoolean,
  jsonCodecInteger,
  jsonCodecNumber,
  jsonCodecPubkey,
} from "../data/Json";
import { pubkeyFromBytes, pubkeyToBytes } from "../data/Pubkey";

export class IdlTypePrimitive {
  public static readonly u8 = new IdlTypePrimitive("u8", 1, 1);
  public static readonly u16 = new IdlTypePrimitive("u16", 2, 2);
  public static readonly u32 = new IdlTypePrimitive("u32", 4, 4);
  public static readonly u64 = new IdlTypePrimitive("u64", 8, 8);
  public static readonly u128 = new IdlTypePrimitive("u128", 16, 16);
  public static readonly i8 = new IdlTypePrimitive("i8", 1, 1);
  public static readonly i16 = new IdlTypePrimitive("i16", 2, 2);
  public static readonly i32 = new IdlTypePrimitive("i32", 4, 4);
  public static readonly i64 = new IdlTypePrimitive("i64", 8, 8);
  public static readonly i128 = new IdlTypePrimitive("i128", 16, 16);
  public static readonly f32 = new IdlTypePrimitive("f32", 4, 4);
  public static readonly f64 = new IdlTypePrimitive("f64", 8, 8);
  public static readonly bool = new IdlTypePrimitive("bool", 1, 1);
  public static readonly pubkey = new IdlTypePrimitive("pubkey", 32, 1);

  public readonly name: string;
  public readonly size: number;
  public readonly alignment: number;

  private constructor(name: string, size: number, alignment: number) {
    this.name = name;
    this.size = size;
    this.alignment = alignment;
  }

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

export function idlTypePrimitiveEncode(
  primitive: IdlTypePrimitive,
  value: JsonValue,
  blobs: Array<Uint8Array>,
) {
  const blob = new Uint8Array(primitive.size);
  primitive.traverse(visitorEncode, blob, value);
  blobs.push(blob);
}

export function idlTypePrimitiveDecode(
  primitive: IdlTypePrimitive,
  data: DataView,
  dataOffset: number,
): [number, JsonValue] {
  return [primitive.size, primitive.traverse(visitorDecode, data, dataOffset)];
}

const visitorEncode = {
  u8: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonCodecInteger.decoder(value);
    blob[0] = Number(num);
  },
  u16: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonCodecInteger.decoder(value);
    const data = new DataView(blob.buffer);
    data.setUint16(0, Number(num), true);
  },
  u32: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonCodecInteger.decoder(value);
    const data = new DataView(blob.buffer);
    data.setUint32(0, Number(num), true);
  },
  u64: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonCodecInteger.decoder(value);
    const data = new DataView(blob.buffer);
    data.setBigUint64(0, num, true);
  },
  u128: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonCodecInteger.decoder(value);
    const data = new DataView(blob.buffer);
    data.setBigUint64(0, num, true);
    data.setBigUint64(8, num >> 64n, true);
  },
  i8: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonCodecInteger.decoder(value);
    const data = new DataView(blob.buffer);
    data.setInt8(0, Number(num));
  },
  i16: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonCodecInteger.decoder(value);
    const data = new DataView(blob.buffer);
    data.setInt16(0, Number(num), true);
  },
  i32: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonCodecInteger.decoder(value);
    const data = new DataView(blob.buffer);
    data.setInt32(0, Number(num), true);
  },
  i64: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonCodecInteger.decoder(value);
    const data = new DataView(blob.buffer);
    data.setBigInt64(0, num, true);
  },
  i128: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonCodecInteger.decoder(value);
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
