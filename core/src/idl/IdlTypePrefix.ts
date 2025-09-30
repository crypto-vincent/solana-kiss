export class IdlTypePrefix {
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

  public static readonly U8 = new IdlTypePrefix("u8", 1);
  public static readonly U16 = new IdlTypePrefix("u16", 2);
  public static readonly U32 = new IdlTypePrefix("u32", 4);
  public static readonly U64 = new IdlTypePrefix("u64", 8);
  public static readonly U128 = new IdlTypePrefix("u128", 16);
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
    blob[0] = Number(value);
    blob[1] = Number(value >> 8n);
  },
  u32: (blob: Uint8Array, value: bigint) => {
    blob[0] = Number(value);
    blob[1] = Number(value >> 8n);
    blob[2] = Number(value >> 16n);
    blob[3] = Number(value >> 24n);
  },
  u64: (blob: Uint8Array, value: bigint) => {
    blob[0] = Number(value);
    blob[1] = Number(value >> 8n);
    blob[2] = Number(value >> 16n);
    blob[3] = Number(value >> 24n);
    blob[4] = Number(value >> 32n);
    blob[5] = Number(value >> 40n);
    blob[6] = Number(value >> 48n);
    blob[7] = Number(value >> 56n);
  },
  u128: (blob: Uint8Array, value: bigint) => {
    const low = value & 0xffffffffffffffffn;
    const high = (value >> 64n) & 0xffffffffffffffffn;
    const data = new DataView(blob.buffer);
    data.setBigUint64(0, low);
    data.setBigUint64(8, high);
  },
};

const visitorDeserialize = {
  u8: (data: DataView, dataOffset: number): bigint => {
    return BigInt(data.getUint8(dataOffset));
  },
  u16: (data: DataView, dataOffset: number): bigint => {
    return BigInt(data.getUint16(dataOffset));
  },
  u32: (data: DataView, dataOffset: number): bigint => {
    return BigInt(data.getUint32(dataOffset));
  },
  u64: (data: DataView, dataOffset: number): bigint => {
    return data.getBigUint64(dataOffset);
  },
  u128: (data: DataView, dataOffset: number): bigint => {
    const low = data.getBigUint64(dataOffset);
    const high = data.getBigUint64(dataOffset + 8);
    return low | (high << 64n);
  },
};
