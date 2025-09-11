export class IdlTypePrefix {
  public static readonly U8 = new IdlTypePrefix('u8', 1);
  public static readonly U16 = new IdlTypePrefix('u16', 2);
  public static readonly U32 = new IdlTypePrefix('u32', 4);
  public static readonly U64 = new IdlTypePrefix('u64', 8);
  public static readonly U128 = new IdlTypePrefix('u128', 16);

  public static readonly prefixesBySize = (() => {
    let prefixes = [
      IdlTypePrefix.U8,
      IdlTypePrefix.U16,
      IdlTypePrefix.U32,
      IdlTypePrefix.U64,
      IdlTypePrefix.U128,
    ];
    let prefixesBySize = new Map<number, IdlTypePrefix>();
    for (let prefix of prefixes) {
      prefixesBySize.set(prefix.size, prefix);
    }
    return prefixesBySize;
  })();

  public name: string;
  public size: number;

  private constructor(name: string, size: number) {
    this.name = name;
    this.size = size;
  }

  public traverse<P1, P2, T>(
    visitor: {
      u8: (param1: P1, param2: P2) => T;
      u16: (param1: P1, param2: P2) => T;
      u32: (param1: P1, param2: P2) => T;
      u64: (param1: P1, param2: P2) => T;
      u128: (param1: P1, param2: P2) => T;
    },
    param1: P1,
    param2: P2,
  ): T {
    return visitor[this.name as keyof typeof visitor](param1, param2);
  }
}
