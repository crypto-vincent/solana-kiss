import { JsonValue } from "../data/Json";
import { IdlTypePrefix } from "./IdlTypePrefix";
import { IdlTypePrimitive } from "./IdlTypePrimitive";

/** Resolved typedef reference with name, optional repr hint, and content type. */
export type IdlTypeFullTypedef = {
  /** The camelCase name of the typedef. */
  name: string;
  /** Memory representation hint (`"rust"`, `"c"`, etc.), or `undefined`. */
  repr: string | undefined;
  /** The fully-resolved type described by this typedef. */
  content: IdlTypeFull;
};
/** An optional value whose presence is indicated by a length prefix. */
export type IdlTypeFullOption = {
  /** Prefix encoding option presence (1=some, 0=none), or `undefined` for default `u8`. */
  prefix: IdlTypePrefix | undefined;
  /** The inner type of the option when present. */
  content: IdlTypeFull;
};
/** A variable-length sequence of items encoded with a length prefix. */
export type IdlTypeFullVec = {
  /** Prefix encoding element count, or `undefined` for default `u32`. */
  prefix: IdlTypePrefix | undefined;
  /** The type of each element in the sequence. */
  items: IdlTypeFull;
};
/** A sequence of items terminated by a sentinel value or the end of data. */
export type IdlTypeFullLoop = {
  /** The type of each element in the sequence. */
  items: IdlTypeFull;
  /** Termination condition: sentinel `{ value }` or `"end"` (end-of-buffer). */
  stop: { value: JsonValue } | "end";
};
/** A fixed-length array with a resolved element count. */
export type IdlTypeFullArray = {
  /** The type of each element in the array. */
  items: IdlTypeFull;
  /** The fixed number of elements in the array. */
  length: number;
};
/** A UTF-8 string encoded with a length prefix. */
export type IdlTypeFullString = {
  /** Prefix encoding byte length, or `undefined` for default `u32`. */
  prefix: IdlTypePrefix | undefined;
};
/** A struct type holding an ordered collection of fully-resolved fields. */
export type IdlTypeFullStruct = {
  /** The fields of the struct (nothing/named/unnamed). */
  fields: IdlTypeFullFields;
};
/** A fully-resolved enum type with precomputed index maps for fast variant lookup. */
export type IdlTypeFullEnum = {
  /** The prefix type used to encode the discriminant value. */
  prefix: IdlTypePrefix | undefined;
  /**
   * Bitmask applied to discriminant before variant lookup. Used for enums that encode extra bits in the discriminant.
   */
  mask: bigint;
  /** Map from variant name (string) to its index in `variants`. */
  indexByName: Map<string, number>;
  /** Map from variant numeric code (`bigint`) to its index in `variants`. */
  indexByCodeBigInt: Map<bigint, number>;
  /** Map from variant numeric code (decimal string) to its index in `variants`. */
  indexByCodeString: Map<string, number>;
  /** `true` if all variants have no fields (unit/fieldless enum). */
  fieldless: boolean;
  /** Ordered list of all enum variants. */
  variants: Array<IdlTypeFullEnumVariant>;
};
/** A type that attempts to match one of several candidate against the same input data. */
export type IdlTypeFullFirst = {
  /** Ordered list of candidate types to attempt matching against the same input data. */
  candidates: Array<{ name: string; content: IdlTypeFull }>;
};
/** A padding wrapper that skips bytes before and after an inner fully-resolved type. */
export type IdlTypeFullPadded = {
  /** Number of bytes to skip before the inner type. */
  before: number;
  /**
   * Minimum total bytes of the padded region (inner type + before padding).
   * Trailing bytes are skipped if needed to reach the minimum.
   */
  minSize: number;
  /** The inner fully-resolved type wrapped by this padding. */
  content: IdlTypeFull;
};
/** A raw byte blob of fixed content used as a discriminator or sentinel. */
export type IdlTypeFullBlob = {
  /** The fixed byte sequence to match or skip during encoding/decoding. */
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
  | "first"
  | "padded"
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
  | IdlTypeFullFirst
  | IdlTypeFullPadded
  | IdlTypeFullBlob
  | IdlTypePrimitive;

/**
 * Algebraic sum type for any fully-resolved IDL type.
 * All typedef references linked; see {@link IdlTypeFlat} for unresolved.
 * Construct via static factory methods; dispatch via {@link traverse}.
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
  /** Creates a `first` variant that attempts to match one of several candidate types against the same input data. */
  public static first(value: IdlTypeFullFirst): IdlTypeFull {
    return new IdlTypeFull("first", value);
  }
  /** Creates a `padded` variant that wraps an inner type with byte padding. */
  public static padded(value: IdlTypeFullPadded): IdlTypeFull {
    return new IdlTypeFull("padded", value);
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

  /** Returns `true` if this type is the `primitive` variant and equals the given primitive instance. */
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
      first: (value: IdlTypeFullFirst, p1: P1, p2: P2, p3: P3) => T;
      padded: (value: IdlTypeFullPadded, p1: P1, p2: P2, p3: P3) => T;
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
  /** The camelCase name of this field. */
  name: string;
  /** The fully-resolved type of this field. */
  content: IdlTypeFull;
};
/** An unnamed (tuple-style) field within a fully-resolved struct or enum variant. */
export type IdlTypeFullFieldUnnamed = {
  /** The fully-resolved type of this positional field. */
  content: IdlTypeFull;
};

type IdlTypeFullFieldsDiscriminant = "nothing" | "named" | "unnamed";
type IdlTypeFullFieldsContent =
  | Array<never>
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
    return new IdlTypeFullFields("nothing", []);
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
   * @returns The value returned by the matched visitor branch.
   */
  public traverse<P1, P2, P3, T>(
    visitor: {
      nothing: (value: Array<never>, p1: P1, p2: P2, p3: P3) => T;
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
    return visitor[this.discriminant](this.content as any, p1, p2, p3);
  }
}

/** A single variant of a fully-resolved enum type, with a name, numeric code, and fields. */
export type IdlTypeFullEnumVariant = {
  /** The camelCase name of this variant. */
  name: string;
  /** The numeric discriminant code for this variant. */
  code: bigint;
  /** The fully-resolved fields of this variant (unit, named, or unnamed). */
  fields: IdlTypeFullFields;
};
