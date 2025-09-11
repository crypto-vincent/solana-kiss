import { IdlTypePrefix } from './IdlTypePrefix';
import { IdlTypePrimitive } from './IdlTypePrimitive';

enum IdlTypeFullDiscriminant {
  Typedef = 'typedef',
  Option = 'option',
  Vec = 'vec',
  Array = 'array',
  String = 'string',
  Struct = 'struct',
  Enum = 'enum',
  Padded = 'padded',
  Const = 'const',
  Primitive = 'primitive',
}

type IdlTypeFullContent =
  | IdlTypeFullTypedef
  | IdlTypeFullOption
  | IdlTypeFullVec
  | IdlTypeFullArray
  | IdlTypeFullString
  | IdlTypeFullStruct
  | IdlTypeFullEnum
  | IdlTypeFullPadded
  | IdlTypeFullConst
  | IdlTypePrimitive;

export type IdlTypeFullTypedef = {
  name: string;
  repr: string | undefined;
  content: IdlTypeFull;
};

export type IdlTypeFullOption = {
  prefix: IdlTypePrefix;
  content: IdlTypeFull;
};

export type IdlTypeFullVec = {
  prefix: IdlTypePrefix;
  items: IdlTypeFull;
};

export type IdlTypeFullArray = {
  items: IdlTypeFull;
  length: number;
};

export type IdlTypeFullString = {
  prefix: IdlTypePrefix;
};

export type IdlTypeFullStruct = {
  fields: IdlTypeFullFields;
};

export type IdlTypeFullEnum = {
  prefix: IdlTypePrefix;
  variants: IdlTypeFullEnumVariant[];
};

export type IdlTypeFullEnumVariant = {
  name: string;
  code: number;
  fields: IdlTypeFullFields;
};

export type IdlTypeFullPadded = {
  before: number;
  minSize: number;
  after: number;
  content: IdlTypeFull;
};

export type IdlTypeFullConst = {
  literal: number;
};

export type IdlTypeFullFieldNamed = {
  name: string;
  content: IdlTypeFull;
};

export type IdlTypeFullFieldUnnamed = {
  position: number;
  content: IdlTypeFull;
};

export class IdlTypeFull {
  private discriminant: IdlTypeFullDiscriminant;
  private content: IdlTypeFullContent;

  private constructor(
    discriminant: IdlTypeFullDiscriminant,
    content: IdlTypeFullContent,
  ) {
    this.discriminant = discriminant;
    this.content = content;
  }

  public static typedef(value: IdlTypeFullTypedef): IdlTypeFull {
    return new IdlTypeFull(IdlTypeFullDiscriminant.Typedef, value);
  }

  public static option(value: IdlTypeFullOption): IdlTypeFull {
    return new IdlTypeFull(IdlTypeFullDiscriminant.Option, value);
  }

  public static vec(value: IdlTypeFullVec): IdlTypeFull {
    return new IdlTypeFull(IdlTypeFullDiscriminant.Vec, value);
  }

  public static array(value: IdlTypeFullArray): IdlTypeFull {
    return new IdlTypeFull(IdlTypeFullDiscriminant.Array, value);
  }

  public static string(value: IdlTypeFullString): IdlTypeFull {
    return new IdlTypeFull(IdlTypeFullDiscriminant.String, value);
  }

  public static struct(value: IdlTypeFullStruct): IdlTypeFull {
    return new IdlTypeFull(IdlTypeFullDiscriminant.Struct, value);
  }

  public static enum(value: IdlTypeFullEnum): IdlTypeFull {
    return new IdlTypeFull(IdlTypeFullDiscriminant.Enum, value);
  }

  public static padded(value: IdlTypeFullPadded): IdlTypeFull {
    return new IdlTypeFull(IdlTypeFullDiscriminant.Padded, value);
  }

  public static const(value: IdlTypeFullConst): IdlTypeFull {
    return new IdlTypeFull(IdlTypeFullDiscriminant.Const, value);
  }

  public static primitive(value: IdlTypePrimitive): IdlTypeFull {
    return new IdlTypeFull(IdlTypeFullDiscriminant.Primitive, value);
  }

  public static nothing(): IdlTypeFull {
    return new IdlTypeFull(IdlTypeFullDiscriminant.Struct, {
      fields: IdlTypeFullFields.nothing(),
    });
  }

  public traverse<P1, P2, P3, T>(
    visitor: {
      typedef: (
        value: IdlTypeFullTypedef,
        param1: P1,
        param2: P2,
        param3: P3,
      ) => T;
      option: (
        value: IdlTypeFullOption,
        param1: P1,
        param2: P2,
        param3: P3,
      ) => T;
      vec: (value: IdlTypeFullVec, param1: P1, param2: P2, param3: P3) => T;
      array: (value: IdlTypeFullArray, param1: P1, param2: P2, param3: P3) => T;
      string: (
        value: IdlTypeFullString,
        param1: P1,
        param2: P2,
        param3: P3,
      ) => T;
      struct: (
        value: IdlTypeFullStruct,
        param1: P1,
        param2: P2,
        param3: P3,
      ) => T;
      enum: (value: IdlTypeFullEnum, param1: P1, param2: P2, param3: P3) => T;
      padded: (
        value: IdlTypeFullPadded,
        param1: P1,
        param2: P2,
        param3: P3,
      ) => T;
      const: (value: IdlTypeFullConst, param1: P1, param2: P2, param3: P3) => T;
      primitive: (
        value: IdlTypePrimitive,
        param1: P1,
        param2: P2,
        param3: P3,
      ) => T;
    },
    param1: P1,
    param2: P2,
    param3: P3,
  ): T {
    return visitor[this.discriminant](
      this.content as any,
      param1,
      param2,
      param3,
    );
  }

  public asConstLiteral(): number | undefined {
    if (this.discriminant == IdlTypeFullDiscriminant.Const) {
      return (this.content as IdlTypeFullConst).literal;
    }
    return undefined;
  }
}

export class IdlTypeFullFields {
  private discriminant: 'named' | 'unnamed';
  private content: IdlTypeFullFieldNamed[] | IdlTypeFullFieldUnnamed[];

  private constructor(
    discriminant: 'named' | 'unnamed',
    content: IdlTypeFullFieldNamed[] | IdlTypeFullFieldUnnamed[],
  ) {
    this.discriminant = discriminant;
    this.content = content;
  }

  public static named(content: IdlTypeFullFieldNamed[]): IdlTypeFullFields {
    return new IdlTypeFullFields('named', content);
  }

  public static unnamed(content: IdlTypeFullFieldUnnamed[]): IdlTypeFullFields {
    return new IdlTypeFullFields('unnamed', content);
  }

  public static nothing(): IdlTypeFullFields {
    return new IdlTypeFullFields('unnamed', []);
  }

  public isEmpty(): boolean {
    return this.content.length === 0;
  }

  public traverse<P1, P2, P3, T>(
    visitor: {
      named: (
        value: IdlTypeFullFieldNamed[],
        param1: P1,
        param2: P2,
        param3: P3,
      ) => T;
      unnamed: (
        value: IdlTypeFullFieldUnnamed[],
        param1: P1,
        param2: P2,
        param3: P3,
      ) => T;
    },
    param1: P1,
    param2: P2,
    param3: P3,
  ) {
    return visitor[this.discriminant](
      this.content as any,
      param1,
      param2,
      param3,
    );
  }
}
