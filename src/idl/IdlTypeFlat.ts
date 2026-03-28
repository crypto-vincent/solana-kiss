import { JsonValue } from "../data/Json";
import { IdlDocs } from "./IdlDocs";
import { IdlTypePrefix } from "./IdlTypePrefix";
import { IdlTypePrimitive } from "./IdlTypePrimitive";

/** A reference to a named typedef, optionally parameterised by generic arguments. */
export type IdlTypeFlatDefined = {
  /** The camelCase name of the typedef being referenced. */
  name: string;
  /** Generic type arguments to substitute for the typedef's type parameters, in order. */
  generics: Array<IdlTypeFlat>;
};
/** A generic type parameter, referenced by its symbol name. */
export type IdlTypeFlatGeneric = {
  /** The symbol name of the generic parameter (e.g. `"T"`). */
  symbol: string;
};
/** An optional value whose presence is indicated by a length prefix. */
export type IdlTypeFlatOption = {
  /** The prefix type encoding option presence (1 = some, 0 = none), or `undefined` for the default `u8`. */
  prefix: IdlTypePrefix | undefined;
  /** The inner type of the option when present. */
  content: IdlTypeFlat;
};
/** A variable-length sequence of items encoded with a length prefix. */
export type IdlTypeFlatVec = {
  /** The prefix type encoding the element count, or `undefined` for the default `u32`. */
  prefix: IdlTypePrefix | undefined;
  /** The type of each element in the sequence. */
  items: IdlTypeFlat;
};
/** A sequence of items terminated by a sentinel value or the end of data. */
export type IdlTypeFlatLoop = {
  /** The type of each element in the sequence. */
  items: IdlTypeFlat;
  /** The termination condition: a specific sentinel `{ value }` or `"end"` meaning end-of-buffer. */
  stop: { value: JsonValue } | "end";
};
/** A fixed-length array whose element count is given by another (flat) type expression. */
export type IdlTypeFlatArray = {
  /** The type of each element in the array. */
  items: IdlTypeFlat;
  /** Flat type expression for the fixed element count. */
  length: IdlTypeFlat;
};
/** A UTF-8 string encoded with a length prefix. */
export type IdlTypeFlatString = {
  /** The prefix type encoding the byte length, or `undefined` for the default `u32`. */
  prefix: IdlTypePrefix | undefined;
};
/** A struct type holding an ordered collection of fields. */
export type IdlTypeFlatStruct = {
  /** The fields of the struct (nothing/named/unnamed). */
  fields: IdlTypeFlatFields;
};
/** An enum type encoded with a discriminant prefix and a set of variants. */
export type IdlTypeFlatEnum = {
  /** The prefix type encoding the discriminant, or `undefined` for the default `u8`. */
  prefix: IdlTypePrefix | undefined;
  /** Ordered list of enum variant definitions. */
  variants: Array<IdlTypeFlatEnumVariant>;
};
/** A type that attempts to match one of several candidate against the same input data. */
export type IdlTypeFlatTrial = {
  /** Ordered list of candidate types to attempt matching against the same input data. */
  candidates: Array<{ name: string; docs: IdlDocs; content: IdlTypeFlat }>;
};
/** A padding wrapper that skips bytes before and after an inner type. */
export type IdlTypeFlatPadded = {
  /** Number of bytes to skip before the inner type. */
  before: number;
  /** Min total bytes (inner + before padding); trailing bytes skipped if needed. */
  minSize: number;
  /** The inner type wrapped by this padding. */
  content: IdlTypeFlat;
};
/** A raw byte blob of fixed content used as a discriminator or sentinel. */
export type IdlTypeFlatBlob = {
  /** The fixed byte sequence to match or skip during encoding/decoding. */
  bytes: Uint8Array;
};
/** A compile-time constant numeric literal used as an array length or similar value. */
export type IdlTypeFlatConst = {
  /** The numeric value of this constant literal. */
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
  | "trial"
  | "padded"
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
  | IdlTypeFlatTrial
  | IdlTypeFlatPadded
  | IdlTypeFlatBlob
  | IdlTypeFlatConst
  | IdlTypePrimitive;

/** Algebraic sum type for unresolved IDL types. Use {@link IdlTypeFull} for resolved. Construct via static factories; dispatch via {@link traverse}. */
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
  public static trial(value: IdlTypeFlatTrial): IdlTypeFlat {
    return new IdlTypeFlat("trial", value);
  }
  /** Creates a `padded` variant that wraps an inner type with byte padding. */
  public static padded(value: IdlTypeFlatPadded): IdlTypeFlat {
    return new IdlTypeFlat("padded", value);
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
   * Dispatches to the matching variant handler.
   * @param visitor - Handler per variant.
   * @param p1 - Forwarded context.
   * @param p2 - Forwarded context.
   * @returns Visitor result.
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
      trial: (value: IdlTypeFlatTrial, p1: P1, p2: P2) => T;
      padded: (value: IdlTypeFlatPadded, p1: P1, p2: P2) => T;
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
  /** The camelCase name of the field. */
  name: string;
  /** Documentation strings, or `undefined`. */
  docs: IdlDocs;
  /** Unresolved flat type of this field. */
  content: IdlTypeFlat;
};
/** An unnamed (tuple-style) field within a struct or enum variant, carrying docs and its flat type. */
export type IdlTypeFlatFieldUnnamed = {
  /** Documentation strings, or `undefined`. */
  docs: IdlDocs;
  /** Unresolved flat type of this positional field. */
  content: IdlTypeFlat;
};

type IdlTypeFlatFieldsDiscriminant = "nothing" | "named" | "unnamed";
type IdlTypeFlatFieldsContent =
  | Array<never>
  | Array<IdlTypeFlatFieldNamed>
  | Array<IdlTypeFlatFieldUnnamed>;

/** Fields of a struct/enum variant: nothing (unit), named, or unnamed (tuple). */
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
    return new IdlTypeFlatFields("nothing", []);
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
   * Dispatches to the matching variant handler.
   * @param visitor - Handler per variant (nothing/named/unnamed).
   * @param p1 - Forwarded context.
   * @param p2 - Forwarded context.
   * @returns Visitor result.
   */
  public traverse<P1, P2, T>(
    visitor: {
      nothing: (value: Array<never>, p1: P1, p2: P2) => T;
      named: (value: Array<IdlTypeFlatFieldNamed>, p1: P1, p2: P2) => T;
      unnamed: (value: Array<IdlTypeFlatFieldUnnamed>, p1: P1, p2: P2) => T;
    },
    p1: P1,
    p2: P2,
  ) {
    return visitor[this.discriminant](this.content as any, p1, p2);
  }
}

/** A single variant of a flat (unresolved) enum type, with an optional name, optional code, docs, and fields. */
export type IdlTypeFlatEnumVariant = {
  /** The name of this variant, or `undefined` for anonymous/indexed variants. */
  name: string | undefined;
  /** The explicit numeric discriminant code for this variant, or `undefined` to use the positional index. */
  code: bigint | undefined;
  /** Documentation strings, or `undefined`. */
  docs: IdlDocs;
  /** Fields of this variant (unit, named, or unnamed). */
  fields: IdlTypeFlatFields;
};
