import { IdlTypePrefix } from './IdlTypePrefix';
import { IdlTypePrimitive } from './IdlTypePrimitive';

enum IdlTypeFlatDiscriminant {
  Defined = 'defined',
  Generic = 'generic',
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

type IdlTypeFlatContent =
  | IdlTypeFlatDefined
  | IdlTypeFlatGeneric
  | IdlTypeFlatOption
  | IdlTypeFlatVec
  | IdlTypeFlatArray
  | IdlTypeFlatString
  | IdlTypeFlatStruct
  | IdlTypeFlatEnum
  | IdlTypeFlatPadded
  | IdlTypeFlatConst
  | IdlTypePrimitive;

export type IdlTypeFlatDefined = {
  name: string;
  generics: IdlTypeFlat[];
};

export type IdlTypeFlatGeneric = {
  symbol: string;
};

export type IdlTypeFlatOption = {
  prefix: IdlTypePrefix;
  content: IdlTypeFlat;
};

export type IdlTypeFlatVec = {
  prefix: IdlTypePrefix;
  items: IdlTypeFlat;
};

export type IdlTypeFlatArray = {
  items: IdlTypeFlat;
  length: IdlTypeFlat;
};

export type IdlTypeFlatString = {
  prefix: IdlTypePrefix;
};

export type IdlTypeFlatStruct = {
  fields: IdlTypeFlatFields;
};

export type IdlTypeFlatEnum = {
  prefix: IdlTypePrefix;
  variants: IdlTypeFlatEnumVariant[];
};

export type IdlTypeFlatEnumVariant = {
  name: string;
  docs: any;
  code: number;
  fields: IdlTypeFlatFields;
};

export type IdlTypeFlatPadded = {
  before: number;
  minSize: number;
  after: number;
  content: IdlTypeFlat;
};

export type IdlTypeFlatConst = {
  literal: number;
};

export type IdlTypeFlatFieldNamed = {
  name: string;
  docs: any;
  content: IdlTypeFlat;
};

export type IdlTypeFlatFieldUnnamed = {
  docs: any;
  content: IdlTypeFlat;
};

export class IdlTypeFlat {
  private discriminant: IdlTypeFlatDiscriminant;
  private content: IdlTypeFlatContent;

  private constructor(
    discriminant: IdlTypeFlatDiscriminant,
    content: IdlTypeFlatContent,
  ) {
    this.discriminant = discriminant;
    this.content = content;
  }

  public static defined(value: IdlTypeFlatDefined): IdlTypeFlat {
    return new IdlTypeFlat(IdlTypeFlatDiscriminant.Defined, value);
  }

  public static generic(value: IdlTypeFlatGeneric): IdlTypeFlat {
    return new IdlTypeFlat(IdlTypeFlatDiscriminant.Generic, value);
  }

  public static option(value: IdlTypeFlatOption): IdlTypeFlat {
    return new IdlTypeFlat(IdlTypeFlatDiscriminant.Option, value);
  }

  public static vec(value: IdlTypeFlatVec): IdlTypeFlat {
    return new IdlTypeFlat(IdlTypeFlatDiscriminant.Vec, value);
  }

  public static array(value: IdlTypeFlatArray): IdlTypeFlat {
    return new IdlTypeFlat(IdlTypeFlatDiscriminant.Array, value);
  }

  public static string(value: IdlTypeFlatString): IdlTypeFlat {
    return new IdlTypeFlat(IdlTypeFlatDiscriminant.String, value);
  }

  public static struct(value: IdlTypeFlatStruct): IdlTypeFlat {
    return new IdlTypeFlat(IdlTypeFlatDiscriminant.Struct, value);
  }

  public static enum(value: IdlTypeFlatEnum): IdlTypeFlat {
    return new IdlTypeFlat(IdlTypeFlatDiscriminant.Enum, value);
  }

  public static padded(value: IdlTypeFlatPadded): IdlTypeFlat {
    return new IdlTypeFlat(IdlTypeFlatDiscriminant.Padded, value);
  }

  public static const(value: IdlTypeFlatConst): IdlTypeFlat {
    return new IdlTypeFlat(IdlTypeFlatDiscriminant.Const, value);
  }

  public static primitive(value: IdlTypePrimitive): IdlTypeFlat {
    return new IdlTypeFlat(IdlTypeFlatDiscriminant.Primitive, value);
  }

  public static nothing(): IdlTypeFlat {
    return new IdlTypeFlat(IdlTypeFlatDiscriminant.Struct, {
      fields: IdlTypeFlatFields.nothing(),
    });
  }

  public traverse<P1, P2, T>(
    visitor: {
      defined: (value: IdlTypeFlatDefined, param1: P1, param2: P2) => T;
      generic: (value: IdlTypeFlatGeneric, param1: P1, param2: P2) => T;
      option: (value: IdlTypeFlatOption, param1: P1, param2: P2) => T;
      vec: (value: IdlTypeFlatVec, param1: P1, param2: P2) => T;
      array: (value: IdlTypeFlatArray, param1: P1, param2: P2) => T;
      string: (value: IdlTypeFlatString, param1: P1, param2: P2) => T;
      struct: (value: IdlTypeFlatStruct, param1: P1, param2: P2) => T;
      enum: (value: IdlTypeFlatEnum, param1: P1, param2: P2) => T;
      padded: (value: IdlTypeFlatPadded, param1: P1, param2: P2) => T;
      const: (value: IdlTypeFlatConst, param1: P1, param2: P2) => T;
      primitive: (value: IdlTypePrimitive, param1: P1, param2: P2) => T;
    },
    param1: P1,
    param2: P2,
  ): T {
    return visitor[this.discriminant](this.content as any, param1, param2);
  }
}

export class IdlTypeFlatFields {
  private discriminant: 'named' | 'unnamed';
  private content: IdlTypeFlatFieldNamed[] | IdlTypeFlatFieldUnnamed[];

  private constructor(
    discriminant: 'named' | 'unnamed',
    content: IdlTypeFlatFieldNamed[] | IdlTypeFlatFieldUnnamed[],
  ) {
    this.discriminant = discriminant;
    this.content = content;
  }

  public static named(content: IdlTypeFlatFieldNamed[]): IdlTypeFlatFields {
    return new IdlTypeFlatFields('named', content);
  }

  public static unnamed(content: IdlTypeFlatFieldUnnamed[]): IdlTypeFlatFields {
    return new IdlTypeFlatFields('unnamed', content);
  }

  public static nothing(): IdlTypeFlatFields {
    return new IdlTypeFlatFields('unnamed', []);
  }

  public traverse<P1, P2, T>(
    visitor: {
      named: (value: IdlTypeFlatFieldNamed[], param1: P1, param2: P2) => T;
      unnamed: (value: IdlTypeFlatFieldUnnamed[], param1: P1, param2: P2) => T;
    },
    param1: P1,
    param2: P2,
  ) {
    return visitor[this.discriminant](this.content as any, param1, param2);
  }
}
