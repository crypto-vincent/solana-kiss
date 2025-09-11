export class IdlTypePrimitive {
  public static readonly U8 = new IdlTypePrimitive({
    name: 'u8',
    size: 1,
    alignment: 1,
  });
  public static readonly U16 = new IdlTypePrimitive({
    name: 'u16',
    size: 2,
    alignment: 2,
  });
  public static readonly U32 = new IdlTypePrimitive({
    name: 'u32',
    size: 4,
    alignment: 4,
  });
  public static readonly U64 = new IdlTypePrimitive({
    name: 'u64',
    size: 8,
    alignment: 8,
  });
  public static readonly U128 = new IdlTypePrimitive({
    name: 'u128',
    size: 16,
    alignment: 16,
  });
  public static readonly I8 = new IdlTypePrimitive({
    name: 'i8',
    size: 1,
    alignment: 1,
  });
  public static readonly I16 = new IdlTypePrimitive({
    name: 'i16',
    size: 2,
    alignment: 2,
  });
  public static readonly I32 = new IdlTypePrimitive({
    name: 'i32',
    size: 4,
    alignment: 4,
  });
  public static readonly I64 = new IdlTypePrimitive({
    name: 'i64',
    size: 8,
    alignment: 8,
  });
  public static readonly I128 = new IdlTypePrimitive({
    name: 'i128',
    size: 16,
    alignment: 16,
  });
  public static readonly F32 = new IdlTypePrimitive({
    name: 'f32',
    size: 4,
    alignment: 4,
  });
  public static readonly F64 = new IdlTypePrimitive({
    name: 'f64',
    size: 8,
    alignment: 8,
  });
  public static readonly Bool = new IdlTypePrimitive({
    name: 'bool',
    size: 1,
    alignment: 1,
  });
  public static readonly Pubkey = new IdlTypePrimitive({
    name: 'pubkey',
    size: 32,
    alignment: 1,
  });

  public static readonly primitiveByName = (() => {
    let primitives = [
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
    let primitivesByName = new Map<string, IdlTypePrimitive>();
    for (let primitive of primitives) {
      primitivesByName.set(primitive.name, primitive);
    }
    return primitivesByName;
  })();

  public name: string;
  public size: number;
  public alignment: number;

  private constructor(value: {
    name: string;
    alignment: number;
    size: number;
  }) {
    this.name = value.name;
    this.size = value.size;
    this.alignment = value.alignment;
  }

  public traverse<P1, P2, T>(
    visitor: {
      u8: (param1: P1, param2: P2) => T;
      u16: (param1: P1, param2: P2) => T;
      u32: (param1: P1, param2: P2) => T;
      u64: (param1: P1, param2: P2) => T;
      u128: (param1: P1, param2: P2) => T;
      i8: (param1: P1, param2: P2) => T;
      i16: (param1: P1, param2: P2) => T;
      i32: (param1: P1, param2: P2) => T;
      i64: (param1: P1, param2: P2) => T;
      i128: (param1: P1, param2: P2) => T;
      f32: (param1: P1, param2: P2) => T;
      f64: (param1: P1, param2: P2) => T;
      bool: (param1: P1, param2: P2) => T;
      pubkey: (param1: P1, param2: P2) => T;
    },
    param1: P1,
    param2: P2,
  ): T {
    return visitor[this.name as keyof typeof visitor](param1, param2);
  }
}
