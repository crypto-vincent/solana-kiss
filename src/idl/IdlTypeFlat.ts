import { JsonValue } from "../data/Json";
import { IdlDocs } from "./IdlDocs";
import { IdlTypePrefix } from "./IdlTypePrefix";
import { IdlTypePrimitive } from "./IdlTypePrimitive";

export type IdlTypeFlatDefined = {
  name: string;
  generics: Array<IdlTypeFlat>;
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
export type IdlTypeFlatLoop = {
  items: IdlTypeFlat;
  stop: { value: JsonValue } | "end";
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
  variants: Array<IdlTypeFlatEnumVariant>;
};
export type IdlTypeFlatPad = {
  before: number;
  end: number;
  content: IdlTypeFlat;
};
export type IdlTypeFlatBlob = {
  bytes: Uint8Array;
};
export type IdlTypeFlatConst = {
  literal: number;
};

type IdlTypeFlatDiscriminant =
  | "defined"
  | "generic"
  | "option"
  | "vec"
  | "loop"
  | "array"
  | "string"
  | "struct"
  | "enum"
  | "pad"
  | "blob"
  | "const"
  | "primitive";
type IdlTypeFlatContent =
  | IdlTypeFlatDefined
  | IdlTypeFlatGeneric
  | IdlTypeFlatOption
  | IdlTypeFlatVec
  | IdlTypeFlatLoop
  | IdlTypeFlatArray
  | IdlTypeFlatString
  | IdlTypeFlatStruct
  | IdlTypeFlatEnum
  | IdlTypeFlatPad
  | IdlTypeFlatBlob
  | IdlTypeFlatConst
  | IdlTypePrimitive;

export class IdlTypeFlat {
  private readonly discriminant: IdlTypeFlatDiscriminant;
  private readonly content: IdlTypeFlatContent;

  private constructor(
    discriminant: IdlTypeFlatDiscriminant,
    content: IdlTypeFlatContent,
  ) {
    this.discriminant = discriminant;
    this.content = content;
  }

  public static defined(value: IdlTypeFlatDefined): IdlTypeFlat {
    return new IdlTypeFlat("defined", value);
  }
  public static generic(value: IdlTypeFlatGeneric): IdlTypeFlat {
    return new IdlTypeFlat("generic", value);
  }
  public static option(value: IdlTypeFlatOption): IdlTypeFlat {
    return new IdlTypeFlat("option", value);
  }
  public static vec(value: IdlTypeFlatVec): IdlTypeFlat {
    return new IdlTypeFlat("vec", value);
  }
  public static loop(value: IdlTypeFlatLoop): IdlTypeFlat {
    return new IdlTypeFlat("loop", value);
  }
  public static array(value: IdlTypeFlatArray): IdlTypeFlat {
    return new IdlTypeFlat("array", value);
  }
  public static string(value: IdlTypeFlatString): IdlTypeFlat {
    return new IdlTypeFlat("string", value);
  }
  public static struct(value: IdlTypeFlatStruct): IdlTypeFlat {
    return new IdlTypeFlat("struct", value);
  }
  public static enum(value: IdlTypeFlatEnum): IdlTypeFlat {
    return new IdlTypeFlat("enum", value);
  }
  public static pad(value: IdlTypeFlatPad): IdlTypeFlat {
    return new IdlTypeFlat("pad", value);
  }
  public static blob(value: IdlTypeFlatBlob): IdlTypeFlat {
    return new IdlTypeFlat("blob", value);
  }
  public static const(value: IdlTypeFlatConst): IdlTypeFlat {
    return new IdlTypeFlat("const", value);
  }
  public static primitive(value: IdlTypePrimitive): IdlTypeFlat {
    return new IdlTypeFlat("primitive", value);
  }

  public static structNothing(): IdlTypeFlat {
    return new IdlTypeFlat("struct", {
      fields: IdlTypeFlatFields.nothing(),
    });
  }

  public traverse<P1, P2, T>(
    visitor: {
      defined: (value: IdlTypeFlatDefined, p1: P1, p2: P2) => T;
      generic: (value: IdlTypeFlatGeneric, p1: P1, p2: P2) => T;
      option: (value: IdlTypeFlatOption, p1: P1, p2: P2) => T;
      vec: (value: IdlTypeFlatVec, p1: P1, p2: P2) => T;
      loop: (value: IdlTypeFlatLoop, p1: P1, p2: P2) => T;
      array: (value: IdlTypeFlatArray, p1: P1, p2: P2) => T;
      string: (value: IdlTypeFlatString, p1: P1, p2: P2) => T;
      struct: (value: IdlTypeFlatStruct, p1: P1, p2: P2) => T;
      enum: (value: IdlTypeFlatEnum, p1: P1, p2: P2) => T;
      pad: (value: IdlTypeFlatPad, p1: P1, p2: P2) => T;
      blob: (value: IdlTypeFlatBlob, p1: P1, p2: P2) => T;
      const: (value: IdlTypeFlatConst, p1: P1, p2: P2) => T;
      primitive: (value: IdlTypePrimitive, p1: P1, p2: P2) => T;
    },
    p1: P1,
    p2: P2,
  ): T {
    return visitor[this.discriminant](this.content as any, p1, p2);
  }
}

export type IdlTypeFlatFieldNamed = {
  name: string;
  docs: IdlDocs;
  content: IdlTypeFlat;
};
export type IdlTypeFlatFieldUnnamed = {
  docs: IdlDocs;
  content: IdlTypeFlat;
};

type IdlTypeFlatFieldsDiscriminant = "nothing" | "named" | "unnamed";
type IdlTypeFlatFieldsContent =
  | null
  | Array<IdlTypeFlatFieldNamed>
  | Array<IdlTypeFlatFieldUnnamed>;

export class IdlTypeFlatFields {
  private readonly discriminant: IdlTypeFlatFieldsDiscriminant;
  private readonly content: IdlTypeFlatFieldsContent;

  private constructor(
    discriminant: IdlTypeFlatFieldsDiscriminant,
    content: IdlTypeFlatFieldsContent,
  ) {
    this.discriminant = discriminant;
    this.content = content;
  }

  public static nothing(): IdlTypeFlatFields {
    return new IdlTypeFlatFields("nothing", null);
  }
  public static named(value: Array<IdlTypeFlatFieldNamed>): IdlTypeFlatFields {
    return new IdlTypeFlatFields("named", value);
  }
  public static unnamed(
    value: Array<IdlTypeFlatFieldUnnamed>,
  ): IdlTypeFlatFields {
    return new IdlTypeFlatFields("unnamed", value);
  }

  public traverse<P1, P2, T>(
    visitor: {
      nothing: (value: null, p1: P1, p2: P2) => T;
      named: (value: Array<IdlTypeFlatFieldNamed>, p1: P1, p2: P2) => T;
      unnamed: (value: Array<IdlTypeFlatFieldUnnamed>, p1: P1, p2: P2) => T;
    },
    p1: P1,
    p2: P2,
  ) {
    switch (this.discriminant) {
      case "nothing":
        return visitor.nothing(this.content as null, p1, p2);
      case "named":
        return visitor.named(
          this.content as Array<IdlTypeFlatFieldNamed>,
          p1,
          p2,
        );
      case "unnamed":
        return visitor.unnamed(
          this.content as Array<IdlTypeFlatFieldUnnamed>,
          p1,
          p2,
        );
    }
  }
}

export type IdlTypeFlatEnumVariant = {
  name: string | undefined;
  code: bigint | undefined;
  docs: IdlDocs;
  fields: IdlTypeFlatFields;
};
