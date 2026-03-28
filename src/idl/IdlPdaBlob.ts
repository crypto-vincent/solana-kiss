import { ErrorStack, withErrorContext } from "../data/Error";
import {
  jsonCodecString,
  jsonDecoderByType,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
  JsonValue,
} from "../data/Json";
import { IdlTypedef } from "./IdlTypedef";
import { idlTypeFlatHydrate } from "./IdlTypeFlatHydrate";
import { IdlTypeFull } from "./IdlTypeFull";
import { idlTypeFullEncode } from "./IdlTypeFullEncode";
import { idlUtilsBlobTypeValueJsonDecoder } from "./IdlUtils";

/** A PDA seed variant that holds a pre-encoded constant byte array. */
export type IdlPdaBlobConst = {
  /** The pre-encoded bytes of this constant seed. */
  bytes: Uint8Array;
};
/** A PDA seed variant that references a named runtime input value with its type and optional default. */
export type IdlPdaBlobInput = {
  /** The name of the runtime input parameter that provides this seed's value. */
  name: string;
  /** The fully-resolved IDL type used to encode the input value into seed bytes. */
  typeFull: IdlTypeFull;
  /** The bytes to use when the input value is not supplied. */
  bytes: Uint8Array | undefined;
};

type IdlPdaBlobDiscriminant = "const" | "input";
type IdlPdaBlobContent = IdlPdaBlobConst | IdlPdaBlobInput;

/** PDA seed: constant bytes or named runtime input. */
export class IdlPdaBlob {
  private readonly discriminant: IdlPdaBlobDiscriminant;
  private readonly content: IdlPdaBlobContent;

  private constructor(
    discriminant: IdlPdaBlobDiscriminant,
    content: IdlPdaBlobContent,
  ) {
    this.discriminant = discriminant;
    this.content = content;
  }

  /** Creates a constant bytes PDA seed. */
  public static const(value: IdlPdaBlobConst): IdlPdaBlob {
    return new IdlPdaBlob("const", value);
  }
  /** Creates a named-input PDA seed. */
  public static input(value: IdlPdaBlobInput): IdlPdaBlob {
    return new IdlPdaBlob("input", value);
  }

  /**
   * Dispatches to the matching variant handler.
   * @param visitor - Handler per variant (`const`, `input`).
   * @param p1 - Forwarded context.
   * @param p2 - Forwarded context.
   * @returns Visitor result.
   */
  public traverse<P1, P2, T>(
    visitor: {
      const: (value: IdlPdaBlobConst, p1: P1, p2: P2) => T;
      input: (value: IdlPdaBlobInput, p1: P1, p2: P2) => T;
    },
    p1: P1,
    p2: P2,
  ): T {
    return visitor[this.discriminant](this.content as any, p1, p2);
  }
}

/**
 * Computes raw bytes for a PDA seed by resolving it against the given inputs.
 * @param self - PDA seed to compute.
 * @param inputs - Named input values.
 * @returns Computed seed bytes.
 */
export function idlPdaBlobCompute(
  self: IdlPdaBlob,
  inputs: Record<string, JsonValue>,
) {
  return self.traverse(computeVisitor, inputs, null);
}

/**
 * Parses a raw IDL PDA blob JSON value into an {@link IdlPdaBlob}.
 * @param pdaBlobValue - Raw JSON PDA seed value.
 * @param typedefsIdls - Known typedef definitions.
 * @returns Parsed {@link IdlPdaBlob}.
 */
export function idlPdaBlobParse(
  pdaBlobValue: JsonValue,
  typedefsIdls: Map<string, IdlTypedef>,
): IdlPdaBlob {
  const { input } = metaJsonDecoder(pdaBlobValue);
  const { typeFlat, value } = idlUtilsBlobTypeValueJsonDecoder(pdaBlobValue);
  if (typeFlat === null) {
    throw new Error(`Missing type`);
  }
  const typeFull = idlTypeFlatHydrate(typeFlat, new Map(), typedefsIdls);
  try {
    const bytes = idlTypeFullEncode(typeFull, value, { blobMode: true });
    if (input === null) {
      return IdlPdaBlob.const({ bytes });
    }
    return IdlPdaBlob.input({ name: input, typeFull, bytes });
  } catch (error) {
    if (value !== null) {
      throw new ErrorStack(`Invalid value`, error);
    }
    if (input !== null) {
      return IdlPdaBlob.input({
        name: input,
        typeFull: typeFull,
        bytes: undefined,
      });
    }
    throw new ErrorStack(`Invalid const value`, error);
  }
}

const computeVisitor = {
  const: (self: IdlPdaBlobConst) => {
    return self.bytes;
  },
  input: (self: IdlPdaBlobInput, inputs: Record<string, JsonValue>) => {
    return withErrorContext(`Input: ${self.name}`, () => {
      const value = inputs[self.name];
      if (value !== undefined) {
        return idlTypeFullEncode(self.typeFull, value, { blobMode: true });
      }
      if (self.bytes !== undefined) {
        return self.bytes;
      }
      throw new Error(`Missing value`);
    });
  },
};

const metaJsonDecoder = jsonDecoderByType({
  string: () => ({ input: null }),
  array: () => ({ input: null }),
  object: jsonDecoderObjectToObject({
    input: jsonDecoderNullable(jsonCodecString.decoder),
  }),
});
