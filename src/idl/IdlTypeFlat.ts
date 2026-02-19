import { JsonValue } from "../data/Json";
import { IdlDocs } from "./IdlDocs";
import { IdlTypePrefix } from "./IdlTypePrefix";
import { IdlTypePrimitive } from "./IdlTypePrimitive";

/** A reference to a named typedef, optionally parameterised by generic arguments. */
export type IdlTypeFlatDefined = {
  name: string;
  generics: Array<IdlTypeFlat>;
};
/** A generic type parameter, referenced by its symbol name. */
export type IdlTypeFlatGeneric = {
  symbol: string;
};
/** An optional value whose presence is indicated by a length prefix. */
export type IdlTypeFlatOption = {
  prefix: IdlTypePrefix;
  content: IdlTypeFlat;
};
/** A variable-length sequence of items encoded with a length prefix. */
export type IdlTypeFlatVec = {
  prefix: IdlTypePrefix;
  items: IdlTypeFlat;
};
/** A sequence of items terminated by a sentinel value or the end of data. */
export type IdlTypeFlatLoop = {
  items: IdlTypeFlat;
  stop: { value: JsonValue } | "end";
};
/** A fixed-length array whose element count is given by another (flat) type expression. */
export type IdlTypeFlatArray = {
  items: IdlTypeFlat;
  length: IdlTypeFlat;
};
/** A UTF-8 string encoded with a length prefix. */
export type IdlTypeFlatString = {
  prefix: IdlTypePrefix;
};
/** A struct type holding an ordered collection of fields. */
export type IdlTypeFlatStruct = {
  fields: IdlTypeFlatFields;
};
/** An enum type encoded with a discriminant prefix and a set of variants. */
export type IdlTypeFlatEnum = {
  prefix: IdlTypePrefix;
  variants: Array<IdlTypeFlatEnumVariant>;
};
/** A padding wrapper that skips bytes before and after an inner type. */
export type IdlTypeFlatPad = {
  before: number;
  end: number;
  content: IdlTypeFlat;
};
/** A raw byte blob of fixed content used as a discriminator or sentinel. */
export type IdlTypeFlatBlob = {
  bytes: Uint8Array;
};
/** A compile-time constant numeric literal used as an array length or similar value. */
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

/**
 * Algebraic sum type representing any unresolved ("flat") IDL type.
 * Named typedef references may not yet be linked; use {@link IdlTypeFull} for fully-resolved types.
 * Construct instances via the static factory methods and dispatch via {@link traverse}.
 */
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

  /** Creates a `defined` variant referencing a named typedef. */
  public static defined(value: IdlTypeFlatDefined): IdlTypeFlat {
    return new IdlTypeFlat("defined", value);
  }
  /** Creates a `generic` variant for a type parameter symbol. */
  public static generic(value: IdlTypeFlatGeneric): IdlTypeFlat {
    return new IdlTypeFlat("generic", value);
  }
  /** Creates an `option` variant for an optional value with a length prefix. */
  public static option(value: IdlTypeFlatOption): IdlTypeFlat {
    return new IdlTypeFlat("option", value);
  }
  /** Creates a `vec` variant for a variable-length sequence with a length prefix. */
  public static vec(value: IdlTypeFlatVec): IdlTypeFlat {
    return new IdlTypeFlat("vec", value);
  }
  /** Creates a `loop` variant for a sentinel-terminated sequence. */
  public static loop(value: IdlTypeFlatLoop): IdlTypeFlat {
    return new IdlTypeFlat("loop", value);
  }
  /** Creates an `array` variant for a fixed-length array. */
  public static array(value: IdlTypeFlatArray): IdlTypeFlat {
    return new IdlTypeFlat("array", value);
  }
  /** Creates a `string` variant for a UTF-8 string with a length prefix. */
  public static string(value: IdlTypeFlatString): IdlTypeFlat {
    return new IdlTypeFlat("string", value);
  }
  /** Creates a `struct` variant with the given fields. */
  public static struct(value: IdlTypeFlatStruct): IdlTypeFlat {
    return new IdlTypeFlat("struct", value);
  }
  /** Creates an `enum` variant with a discriminant prefix and variants. */
  public static enum(value: IdlTypeFlatEnum): IdlTypeFlat {
    return new IdlTypeFlat("enum", value);
  }
  /** Creates a `pad` variant that wraps an inner type with byte padding. */
  public static pad(value: IdlTypeFlatPad): IdlTypeFlat {
    return new IdlTypeFlat("pad", value);
  }
  /** Creates a `blob` variant for a raw byte sequence. */
  public static blob(value: IdlTypeFlatBlob): IdlTypeFlat {
    return new IdlTypeFlat("blob", value);
  }
  /** Creates a `const` variant for a compile-time numeric literal. */
  public static const(value: IdlTypeFlatConst): IdlTypeFlat {
    return new IdlTypeFlat("const", value);
  }
  /** Creates a `primitive` variant wrapping a known scalar primitive type. */
  public static primitive(value: IdlTypePrimitive): IdlTypeFlat {
    return new IdlTypeFlat("primitive", value);
  }

  /** Creates a `struct` variant with no fields (empty struct). */
  public static structNothing(): IdlTypeFlat {
    return new IdlTypeFlat("struct", {
      fields: IdlTypeFlatFields.nothing(),
    });
  }

  /**
   * Dispatches to the matching visitor branch based on this type's discriminant.
   * @param visitor - An object with one handler per variant.
   * @param p1 - First context parameter forwarded to the visitor.
   * @param p2 - Second context parameter forwarded to the visitor.
   * @returns The value returned by the matched visitor branch.
   */
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

/** A named field within a struct or enum variant, carrying a name, docs, and its flat type. */
export type IdlTypeFlatFieldNamed = {
  name: string;
  docs: IdlDocs;
  content: IdlTypeFlat;
};
/** An unnamed (tuple-style) field within a struct or enum variant, carrying docs and its flat type. */
export type IdlTypeFlatFieldUnnamed = {
  docs: IdlDocs;
  content: IdlTypeFlat;
};

type IdlTypeFlatFieldsDiscriminant = "nothing" | "named" | "unnamed";
type IdlTypeFlatFieldsContent =
  | null
  | Array<IdlTypeFlatFieldNamed>
  | Array<IdlTypeFlatFieldUnnamed>;

/**
 * Algebraic sum type representing the fields of a struct or enum variant in the flat (unresolved) type system.
 * Can be nothing (unit), a list of named fields, or a list of unnamed (tuple) fields.
 */
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

  /** Creates a `nothing` variant representing a unit (no fields). */
  public static nothing(): IdlTypeFlatFields {
    return new IdlTypeFlatFields("nothing", null);
  }
  /** Creates a `named` variant wrapping a list of named fields. */
  public static named(value: Array<IdlTypeFlatFieldNamed>): IdlTypeFlatFields {
    return new IdlTypeFlatFields("named", value);
  }
  /** Creates an `unnamed` variant wrapping a list of positional (tuple-style) fields. */
  public static unnamed(
    value: Array<IdlTypeFlatFieldUnnamed>,
  ): IdlTypeFlatFields {
    return new IdlTypeFlatFields("unnamed", value);
  }

  /**
   * Dispatches to the matching visitor branch based on this fields discriminant.
   * @param visitor - An object with one handler per variant (nothing/named/unnamed).
   * @param p1 - First context parameter forwarded to the visitor.
   * @param p2 - Second context parameter forwarded to the visitor.
   */
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

/** A single variant of a flat (unresolved) enum type, with an optional name, optional code, docs, and fields. */
export type IdlTypeFlatEnumVariant = {
  name: string | undefined;
  code: bigint | undefined;
  docs: IdlDocs;
  fields: IdlTypeFlatFields;
};
