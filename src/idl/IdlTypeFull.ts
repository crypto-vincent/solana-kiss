import { JsonValue } from "../data/Json";
import { IdlTypePrefix } from "./IdlTypePrefix";
import { IdlTypePrimitive } from "./IdlTypePrimitive";

// TODO (experiment) - support json schema generation ?

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
export type IdlTypeFullLoop = {
  items: IdlTypeFull;
  stop: { value: JsonValue } | "end";
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
  mask: bigint;
  indexByName: Map<string, number>;
  indexByCodeBigInt: Map<bigint, number>;
  indexByCodeString: Map<string, number>;
  variants: Array<IdlTypeFullEnumVariant>;
};
export type IdlTypeFullPad = {
  before: number; // TODO (repr) - can this be deprecated when transparent padding is supported ?
  end: number;
  content: IdlTypeFull;
};
export type IdlTypeFullBlob = {
  bytes: Uint8Array;
};

type IdlTypeFullDiscriminant =
  | "typedef"
  | "option"
  | "vec"
  | "loop"
  | "array"
  | "string"
  | "struct"
  | "enum"
  | "pad"
  | "blob"
  | "primitive";
type IdlTypeFullContent =
  | IdlTypeFullTypedef
  | IdlTypeFullOption
  | IdlTypeFullVec
  | IdlTypeFullLoop
  | IdlTypeFullArray
  | IdlTypeFullString
  | IdlTypeFullStruct
  | IdlTypeFullEnum
  | IdlTypeFullPad
  | IdlTypeFullBlob
  | IdlTypePrimitive;

export class IdlTypeFull {
  private readonly discriminant: IdlTypeFullDiscriminant;
  private readonly content: IdlTypeFullContent;

  private constructor(
    discriminant: IdlTypeFullDiscriminant,
    content: IdlTypeFullContent,
  ) {
    this.discriminant = discriminant;
    this.content = content;
  }

  public static typedef(value: IdlTypeFullTypedef): IdlTypeFull {
    return new IdlTypeFull("typedef", value);
  }
  public static option(value: IdlTypeFullOption): IdlTypeFull {
    return new IdlTypeFull("option", value);
  }
  public static vec(value: IdlTypeFullVec): IdlTypeFull {
    return new IdlTypeFull("vec", value);
  }
  public static loop(value: IdlTypeFullLoop): IdlTypeFull {
    return new IdlTypeFull("loop", value);
  }
  public static array(value: IdlTypeFullArray): IdlTypeFull {
    return new IdlTypeFull("array", value);
  }
  public static string(value: IdlTypeFullString): IdlTypeFull {
    return new IdlTypeFull("string", value);
  }
  public static struct(value: IdlTypeFullStruct): IdlTypeFull {
    return new IdlTypeFull("struct", value);
  }
  public static enum(value: IdlTypeFullEnum): IdlTypeFull {
    return new IdlTypeFull("enum", value);
  }
  public static pad(value: IdlTypeFullPad): IdlTypeFull {
    return new IdlTypeFull("pad", value);
  }
  public static blob(value: IdlTypeFullBlob): IdlTypeFull {
    return new IdlTypeFull("blob", value);
  }
  public static primitive(value: IdlTypePrimitive): IdlTypeFull {
    return new IdlTypeFull("primitive", value);
  }

  public static structNothing(): IdlTypeFull {
    return new IdlTypeFull("struct", {
      fields: IdlTypeFullFields.nothing(),
    });
  }

  public isPrimitive(primitive: IdlTypePrimitive): boolean {
    return this.discriminant === "primitive" && this.content === primitive;
  }

  public traverse<P1, P2, P3, T>(
    visitor: {
      typedef: (value: IdlTypeFullTypedef, p1: P1, p2: P2, p3: P3) => T;
      option: (value: IdlTypeFullOption, p1: P1, p2: P2, p3: P3) => T;
      vec: (value: IdlTypeFullVec, p1: P1, p2: P2, p3: P3) => T;
      loop: (value: IdlTypeFullLoop, p1: P1, p2: P2, p3: P3) => T;
      array: (value: IdlTypeFullArray, p1: P1, p2: P2, p3: P3) => T;
      string: (value: IdlTypeFullString, p1: P1, p2: P2, p3: P3) => T;
      struct: (value: IdlTypeFullStruct, p1: P1, p2: P2, p3: P3) => T;
      enum: (value: IdlTypeFullEnum, p1: P1, p2: P2, p3: P3) => T;
      pad: (value: IdlTypeFullPad, p1: P1, p2: P2, p3: P3) => T;
      blob: (value: IdlTypeFullBlob, p1: P1, p2: P2, p3: P3) => T;
      primitive: (value: IdlTypePrimitive, p1: P1, p2: P2, p3: P3) => T;
    },
    p1: P1,
    p2: P2,
    p3: P3,
  ): T {
    return visitor[this.discriminant](this.content as any, p1, p2, p3);
  }
}

export type IdlTypeFullFieldNamed = {
  name: string;
  content: IdlTypeFull;
};
export type IdlTypeFullFieldUnnamed = {
  position: number;
  content: IdlTypeFull;
};

type IdlTypeFullFieldsDiscriminant = "nothing" | "named" | "unnamed";
type IdlTypeFullFieldsContent =
  | null
  | Array<IdlTypeFullFieldNamed>
  | Array<IdlTypeFullFieldUnnamed>;

export class IdlTypeFullFields {
  private readonly discriminant: IdlTypeFullFieldsDiscriminant;
  private readonly content: IdlTypeFullFieldsContent;

  private constructor(
    discriminant: IdlTypeFullFieldsDiscriminant,
    content: IdlTypeFullFieldsContent,
  ) {
    this.discriminant = discriminant;
    this.content = content;
  }

  public static nothing(): IdlTypeFullFields {
    return new IdlTypeFullFields("nothing", null);
  }
  public static named(value: Array<IdlTypeFullFieldNamed>): IdlTypeFullFields {
    return new IdlTypeFullFields("named", value);
  }
  public static unnamed(
    value: Array<IdlTypeFullFieldUnnamed>,
  ): IdlTypeFullFields {
    return new IdlTypeFullFields("unnamed", value);
  }

  public isNothing(): boolean {
    return this.discriminant === "nothing";
  }

  public traverse<P1, P2, P3, T>(
    visitor: {
      nothing: (value: null, p1: P1, p2: P2, p3: P3) => T;
      named: (value: Array<IdlTypeFullFieldNamed>, p1: P1, p2: P2, p3: P3) => T;
      unnamed: (
        value: Array<IdlTypeFullFieldUnnamed>,
        p1: P1,
        p2: P2,
        p3: P3,
      ) => T;
    },
    p1: P1,
    p2: P2,
    p3: P3,
  ) {
    switch (this.discriminant) {
      case "nothing":
        return visitor.nothing(this.content as null, p1, p2, p3);
      case "named":
        return visitor.named(
          this.content as Array<IdlTypeFullFieldNamed>,
          p1,
          p2,
          p3,
        );
      case "unnamed":
        return visitor.unnamed(
          this.content as Array<IdlTypeFullFieldUnnamed>,
          p1,
          p2,
          p3,
        );
    }
  }
}

export type IdlTypeFullEnumVariant = {
  name: string;
  code: bigint;
  fields: IdlTypeFullFields;
};
