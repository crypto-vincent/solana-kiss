export class IdlTypePrefix {
  public static readonly U8 = new IdlTypePrefix("u8", 1);
  public static readonly U16 = new IdlTypePrefix("u16", 2);
  public static readonly U32 = new IdlTypePrefix("u32", 4);
  public static readonly U64 = new IdlTypePrefix("u64", 8);
  public static readonly U128 = new IdlTypePrefix("u128", 16);

  public static readonly prefixesBySize: ReadonlyMap<number, IdlTypePrefix> =
    (() => {
      const prefixes = [
        IdlTypePrefix.U8,
        IdlTypePrefix.U16,
        IdlTypePrefix.U32,
        IdlTypePrefix.U64,
        IdlTypePrefix.U128,
      ];
      const prefixesBySize = new Map<number, IdlTypePrefix>();
      for (const prefix of prefixes) {
        prefixesBySize.set(prefix.size, prefix);
      }
      return prefixesBySize;
    })();

  public readonly name: string;
  public readonly size: number;

  private constructor(name: string, size: number) {
    this.name = name;
    this.size = size;
  }

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

export function idlTypePrefixSerialize(
  prefix: IdlTypePrefix,
  value: bigint,
  blobs: Array<Uint8Array>,
) {
  const blob = new Uint8Array(prefix.size);
  prefix.traverse(visitorSerialize, blob, value);
  blobs.push(blob);
}

export function idlTypePrefixDeserialize(
  prefix: IdlTypePrefix,
  data: DataView,
  dataOffset: number,
): [number, bigint] {
  return [prefix.size, prefix.traverse(visitorDeserialize, data, dataOffset)];
}

const visitorSerialize = {
  u8: (blob: Uint8Array, value: bigint) => {
    blob[0] = Number(value);
  },
  u16: (blob: Uint8Array, value: bigint) => {
    const data = new DataView(blob.buffer);
    data.setUint16(0, Number(value), true);
  },
  u32: (blob: Uint8Array, value: bigint) => {
    const data = new DataView(blob.buffer);
    data.setUint32(0, Number(value), true);
  },
  u64: (blob: Uint8Array, value: bigint) => {
    const data = new DataView(blob.buffer);
    data.setBigUint64(0, value, true);
  },
  u128: (blob: Uint8Array, value: bigint) => {
    const data = new DataView(blob.buffer);
    data.setBigUint64(0, value, true);
    data.setBigUint64(8, value >> 64n, true);
  },
};

const visitorDeserialize = {
  u8: (data: DataView, dataOffset: number): bigint => {
    return BigInt(data.getUint8(dataOffset));
  },
  u16: (data: DataView, dataOffset: number): bigint => {
    return BigInt(data.getUint16(dataOffset, true));
  },
  u32: (data: DataView, dataOffset: number): bigint => {
    return BigInt(data.getUint32(dataOffset, true));
  },
  u64: (data: DataView, dataOffset: number): bigint => {
    return data.getBigUint64(dataOffset, true);
  },
  u128: (data: DataView, dataOffset: number): bigint => {
    const low = data.getBigUint64(dataOffset, true);
    const high = data.getBigUint64(dataOffset + 8, true);
    return low | (high << 64n);
  },
};
