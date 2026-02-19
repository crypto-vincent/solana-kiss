import { JsonValue } from "../data/Json";
import { IdlTypePrefix } from "./IdlTypePrefix";
import { IdlTypePrimitive } from "./IdlTypePrimitive";

/** A resolved typedef reference, carrying the typedef name, optional repr hint, and its full content type. */
export type IdlTypeFullTypedef = {
  name: string;
  repr: string | undefined;
  content: IdlTypeFull;
};
/** An optional value whose presence is indicated by a length prefix. */
export type IdlTypeFullOption = {
  prefix: IdlTypePrefix;
  content: IdlTypeFull;
};
/** A variable-length sequence of items encoded with a length prefix. */
export type IdlTypeFullVec = {
  prefix: IdlTypePrefix;
  items: IdlTypeFull;
};
/** A sequence of items terminated by a sentinel value or the end of data. */
export type IdlTypeFullLoop = {
  items: IdlTypeFull;
  stop: { value: JsonValue } | "end";
};
/** A fixed-length array with a resolved element count. */
export type IdlTypeFullArray = {
  items: IdlTypeFull;
  length: number;
};
/** A UTF-8 string encoded with a length prefix. */
export type IdlTypeFullString = {
  prefix: IdlTypePrefix;
};
/** A struct type holding an ordered collection of fully-resolved fields. */
export type IdlTypeFullStruct = {
  fields: IdlTypeFullFields;
};
/** A fully-resolved enum type with precomputed index maps for fast variant lookup. */
export type IdlTypeFullEnum = {
  prefix: IdlTypePrefix;
  mask: bigint;
  indexByName: Map<string, number>;
  indexByCodeBigInt: Map<bigint, number>;
  indexByCodeString: Map<string, number>;
  variants: Array<IdlTypeFullEnumVariant>;
};
/** A padding wrapper that skips bytes before and after an inner fully-resolved type. */
export type IdlTypeFullPad = {
  before: number; // TODO (repr) - can this be deprecated when transparent padding is supported ?
  end: number;
  content: IdlTypeFull;
};
/** A raw byte blob of fixed content used as a discriminator or sentinel. */
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

/**
 * Algebraic sum type representing any fully-resolved IDL type.
 * All typedef references have been linked; use {@link IdlTypeFlat} for unresolved types.
 * Construct instances via the static factory methods and dispatch via {@link traverse}.
 */
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

  /** Creates a `typedef` variant wrapping a resolved typedef reference. */
  public static typedef(value: IdlTypeFullTypedef): IdlTypeFull {
    return new IdlTypeFull("typedef", value);
  }
  /** Creates an `option` variant for an optional value with a length prefix. */
  public static option(value: IdlTypeFullOption): IdlTypeFull {
    return new IdlTypeFull("option", value);
  }
  /** Creates a `vec` variant for a variable-length sequence with a length prefix. */
  public static vec(value: IdlTypeFullVec): IdlTypeFull {
    return new IdlTypeFull("vec", value);
  }
  /** Creates a `loop` variant for a sentinel-terminated sequence. */
  public static loop(value: IdlTypeFullLoop): IdlTypeFull {
    return new IdlTypeFull("loop", value);
  }
  /** Creates an `array` variant for a fixed-length array. */
  public static array(value: IdlTypeFullArray): IdlTypeFull {
    return new IdlTypeFull("array", value);
  }
  /** Creates a `string` variant for a UTF-8 string with a length prefix. */
  public static string(value: IdlTypeFullString): IdlTypeFull {
    return new IdlTypeFull("string", value);
  }
  /** Creates a `struct` variant with the given fields. */
  public static struct(value: IdlTypeFullStruct): IdlTypeFull {
    return new IdlTypeFull("struct", value);
  }
  /** Creates an `enum` variant with precomputed index maps and variants. */
  public static enum(value: IdlTypeFullEnum): IdlTypeFull {
    return new IdlTypeFull("enum", value);
  }
  /** Creates a `pad` variant that wraps an inner type with byte padding. */
  public static pad(value: IdlTypeFullPad): IdlTypeFull {
    return new IdlTypeFull("pad", value);
  }
  /** Creates a `blob` variant for a raw byte sequence. */
  public static blob(value: IdlTypeFullBlob): IdlTypeFull {
    return new IdlTypeFull("blob", value);
  }
  /** Creates a `primitive` variant wrapping a known scalar primitive type. */
  public static primitive(value: IdlTypePrimitive): IdlTypeFull {
    return new IdlTypeFull("primitive", value);
  }

  /** Creates a `struct` variant with no fields (empty/unit struct). */
  public static structNothing(): IdlTypeFull {
    return new IdlTypeFull("struct", {
      fields: IdlTypeFullFields.nothing(),
    });
  }

  /**
   * Returns `true` if this type is the `primitive` variant and equals the given primitive instance.
   */
  public isPrimitive(primitive: IdlTypePrimitive): boolean {
    return this.discriminant === "primitive" && this.content === primitive;
  }

  /**
   * Dispatches to the matching visitor branch based on this type's discriminant.
   * @param visitor - An object with one handler per variant.
   * @param p1 - First context parameter forwarded to the visitor.
   * @param p2 - Second context parameter forwarded to the visitor.
   * @param p3 - Third context parameter forwarded to the visitor.
   * @returns The value returned by the matched visitor branch.
   */
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

/** A named field within a fully-resolved struct or enum variant. */
export type IdlTypeFullFieldNamed = {
  name: string;
  content: IdlTypeFull;
};
/** An unnamed (tuple-style) field within a fully-resolved struct or enum variant. */
export type IdlTypeFullFieldUnnamed = {
  content: IdlTypeFull;
};

type IdlTypeFullFieldsDiscriminant = "nothing" | "named" | "unnamed";
type IdlTypeFullFieldsContent =
  | null
  | Array<IdlTypeFullFieldNamed>
  | Array<IdlTypeFullFieldUnnamed>;

/**
 * Algebraic sum type representing the fields of a struct or enum variant in the full (resolved) type system.
 * Can be nothing (unit), a list of named fields, or a list of unnamed (tuple) fields.
 */
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

  /** Creates a `nothing` variant representing a unit (no fields). */
  public static nothing(): IdlTypeFullFields {
    return new IdlTypeFullFields("nothing", null);
  }
  /** Creates a `named` variant wrapping a list of named fields. */
  public static named(value: Array<IdlTypeFullFieldNamed>): IdlTypeFullFields {
    return new IdlTypeFullFields("named", value);
  }
  /** Creates an `unnamed` variant wrapping a list of positional (tuple-style) fields. */
  public static unnamed(
    value: Array<IdlTypeFullFieldUnnamed>,
  ): IdlTypeFullFields {
    return new IdlTypeFullFields("unnamed", value);
  }

  /** Returns `true` if this fields value is the `nothing` (unit) variant. */
  public isNothing(): boolean {
    return this.discriminant === "nothing";
  }

  /**
   * Dispatches to the matching visitor branch based on this fields discriminant.
   * @param visitor - An object with one handler per variant (nothing/named/unnamed).
   * @param p1 - First context parameter forwarded to the visitor.
   * @param p2 - Second context parameter forwarded to the visitor.
   * @param p3 - Third context parameter forwarded to the visitor.
   */
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

/** A single variant of a fully-resolved enum type, with a name, numeric code, and fields. */
export type IdlTypeFullEnumVariant = {
  name: string;
  code: bigint;
  fields: IdlTypeFullFields;
};
