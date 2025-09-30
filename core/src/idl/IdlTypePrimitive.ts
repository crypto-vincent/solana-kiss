import {
  jsonAsNumber,
  jsonAsString,
  jsonExpectBoolean,
  jsonExpectString,
  jsonPreview,
  JsonValue,
} from "../data/json";
import { pubkeyFromBytes, pubkeyToBytes } from "../data/pubkey";

export class IdlTypePrimitive {
  public static readonly primitivesByName: ReadonlyMap<
    string,
    IdlTypePrimitive
  > = (() => {
    const primitives = [
      IdlTypePrimitive.U8,
      IdlTypePrimitive.U16,
      IdlTypePrimitive.U32,
      IdlTypePrimitive.U64,
      IdlTypePrimitive.U128,
      IdlTypePrimitive.I8,
      IdlTypePrimitive.I16,
      IdlTypePrimitive.I32,
      IdlTypePrimitive.I64,
      IdlTypePrimitive.I128,
      IdlTypePrimitive.F32,
      IdlTypePrimitive.F64,
      IdlTypePrimitive.Bool,
      IdlTypePrimitive.Pubkey,
    ];
    const primitivesByName = new Map<string, IdlTypePrimitive>();
    for (const primitive of primitives) {
      primitivesByName.set(primitive.name, primitive);
    }
    return primitivesByName;
  })();

  public readonly name: string;
  public readonly size: number;
  public readonly alignment: number;

  private constructor(value: {
    name: string;
    size: number;
    alignment: number;
  }) {
    this.name = value.name;
    this.size = value.size;
    this.alignment = value.alignment;
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

  public static readonly U8 = new IdlTypePrimitive({
    name: "u8",
    size: 1,
    alignment: 1,
  });
  public static readonly U16 = new IdlTypePrimitive({
    name: "u16",
    size: 2,
    alignment: 2,
  });
  public static readonly U32 = new IdlTypePrimitive({
    name: "u32",
    size: 4,
    alignment: 4,
  });
  public static readonly U64 = new IdlTypePrimitive({
    name: "u64",
    size: 8,
    alignment: 8,
  });
  public static readonly U128 = new IdlTypePrimitive({
    name: "u128",
    size: 16,
    alignment: 16,
  });
  public static readonly I8 = new IdlTypePrimitive({
    name: "i8",
    size: 1,
    alignment: 1,
  });
  public static readonly I16 = new IdlTypePrimitive({
    name: "i16",
    size: 2,
    alignment: 2,
  });
  public static readonly I32 = new IdlTypePrimitive({
    name: "i32",
    size: 4,
    alignment: 4,
  });
  public static readonly I64 = new IdlTypePrimitive({
    name: "i64",
    size: 8,
    alignment: 8,
  });
  public static readonly I128 = new IdlTypePrimitive({
    name: "i128",
    size: 16,
    alignment: 16,
  });
  public static readonly F32 = new IdlTypePrimitive({
    name: "f32",
    size: 4,
    alignment: 4,
  });
  public static readonly F64 = new IdlTypePrimitive({
    name: "f64",
    size: 8,
    alignment: 8,
  });
  public static readonly Bool = new IdlTypePrimitive({
    name: "bool",
    size: 1,
    alignment: 1,
  });
  public static readonly Pubkey = new IdlTypePrimitive({
    name: "pubkey",
    size: 32,
    alignment: 1,
  });
}

export function idlTypePrimitiveSerialize(
  primitive: IdlTypePrimitive,
  value: JsonValue,
  blobs: Array<Uint8Array>,
) {
  const blob = new Uint8Array(primitive.size);
  primitive.traverse(visitorSerialize, blob, value);
  blobs.push(blob);
}

export function idlTypePrimitiveDeserialize(
  primitive: IdlTypePrimitive,
  data: DataView,
  dataOffset: number,
): [number, JsonValue] {
  return [
    primitive.size,
    primitive.traverse(visitorDeserialize, data, dataOffset),
  ];
}

const visitorSerialize = {
  u8: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonExpectInteger(value);
    blob[0] = Number(num);
  },
  u16: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonExpectInteger(value);
    blob[0] = Number(num);
    blob[1] = Number(num >> 8n);
  },
  u32: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonExpectInteger(value);
    blob[0] = Number(num);
    blob[1] = Number(num >> 8n);
    blob[2] = Number(num >> 16n);
    blob[3] = Number(num >> 24n);
  },
  u64: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonExpectInteger(value);
    blob[0] = Number(num);
    blob[1] = Number(num >> 8n);
    blob[2] = Number(num >> 16n);
    blob[3] = Number(num >> 24n);
    blob[4] = Number(num >> 32n);
    blob[5] = Number(num >> 40n);
    blob[6] = Number(num >> 48n);
    blob[7] = Number(num >> 56n);
  },
  u128: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonExpectInteger(value);
    const low = num & 0xffffffffffffffffn;
    const high = (num >> 64n) & 0xffffffffffffffffn;
    const data = new DataView(blob.buffer);
    data.setBigUint64(0, low);
    data.setBigUint64(8, high);
  },
  i8: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonExpectInteger(value);
    const data = new DataView(blob.buffer);
    data.setInt8(0, Number(num));
  },
  i16: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonExpectInteger(value);
    const data = new DataView(blob.buffer);
    data.setInt16(0, Number(num));
  },
  i32: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonExpectInteger(value);
    const data = new DataView(blob.buffer);
    data.setInt32(0, Number(num));
  },
  i64: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonExpectInteger(value);
    const data = new DataView(blob.buffer);
    data.setBigInt64(0, num);
  },
  i128: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonExpectInteger(value);
    const low = BigInt.asIntN(64, num);
    const high = BigInt.asIntN(64, num >> 64n);
    const data = new DataView(blob.buffer);
    data.setBigInt64(0, low);
    data.setBigInt64(8, high);
  },
  f32: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonExpectFloating(value);
    const data = new DataView(blob.buffer);
    data.setFloat32(0, num);
  },
  f64: (blob: Uint8Array, value: JsonValue) => {
    const num = jsonExpectFloating(value);
    const data = new DataView(blob.buffer);
    data.setFloat64(0, num);
  },
  bool: (blob: Uint8Array, value: JsonValue) => {
    const data = new DataView(blob.buffer);
    if (jsonExpectBoolean(value)) {
      data.setUint8(0, 1);
    } else {
      data.setUint8(0, 0);
    }
  },
  pubkey: (blob: Uint8Array, value: JsonValue) => {
    blob.set(pubkeyToBytes(jsonExpectString(value)));
  },
};

function jsonExpectInteger(value: JsonValue): bigint {
  const number = jsonAsNumber(value);
  if (number !== undefined) {
    return BigInt(number);
  }
  const string = jsonAsString(value);
  if (string !== undefined) {
    return BigInt(string);
  }
  throw new Error(`Expected an integer (found: ${jsonPreview(value)})`);
}

function jsonExpectFloating(value: JsonValue): number {
  const number = jsonAsNumber(value);
  if (number !== undefined) {
    return Number(number);
  }
  const string = jsonAsString(value);
  if (string !== undefined) {
    return Number(string);
  }
  throw new Error(
    `Expected a floating-point number (found: ${jsonPreview(value)})`,
  );
}

const visitorDeserialize = {
  u8: (data: DataView, dataOffset: number): any => {
    return data.getUint8(dataOffset);
  },
  u16: (data: DataView, dataOffset: number): any => {
    return data.getUint16(dataOffset);
  },
  u32: (data: DataView, dataOffset: number): any => {
    return data.getUint32(dataOffset);
  },
  u64: (data: DataView, dataOffset: number): any => {
    return data.getBigUint64(dataOffset).toString();
  },
  u128: (data: DataView, dataOffset: number): any => {
    const low = data.getBigUint64(dataOffset);
    const high = data.getBigUint64(dataOffset + 8);
    return (low | (high << 64n)).toString();
  },
  i8: (data: DataView, dataOffset: number): any => {
    return data.getInt8(dataOffset);
  },
  i16: (data: DataView, dataOffset: number): any => {
    return data.getInt16(dataOffset);
  },
  i32: (data: DataView, dataOffset: number): any => {
    return data.getInt32(dataOffset);
  },
  i64: (data: DataView, dataOffset: number): any => {
    return data.getBigInt64(dataOffset).toString();
  },
  i128: (data: DataView, dataOffset: number): any => {
    const low = data.getBigUint64(dataOffset); // TODO - is this correct ?
    const high = data.getBigInt64(dataOffset + 8);
    return (low | (high << 64n)).toString();
  },
  f32: (data: DataView, dataOffset: number): any => {
    return data.getFloat32(dataOffset);
  },
  f64: (data: DataView, dataOffset: number): any => {
    return data.getFloat64(dataOffset);
  },
  bool: (data: DataView, dataOffset: number): any => {
    return data.getUint8(dataOffset) != 0;
  },
  pubkey: (data: DataView, dataOffset: number): any => {
    return pubkeyFromBytes(new Uint8Array(data.buffer, dataOffset, 32));
  },
};
