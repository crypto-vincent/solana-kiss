import { ErrorStack, withErrorContext } from "../data/Error";
import {
  jsonCodecString,
  jsonDecoderByType,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
  jsonPreview,
  JsonValue,
} from "../data/Json";
import { IdlTypedef } from "./IdlTypedef";
import { IdlTypeFull } from "./IdlTypeFull";
import { idlTypeFullEncode } from "./IdlTypeFullEncode";
import {
  idlUtilsBlobTypeValueParse,
  idlUtilsBlobValueGuessType,
} from "./IdlUtils";

/** A PDA seed variant that holds a pre-encoded constant byte array. */
export type IdlPdaBlobConst = {
  bytes: Uint8Array;
};
/** A PDA seed variant that references a named runtime input value with its type and optional default. */
export type IdlPdaBlobInput = {
  name: string;
  value: JsonValue;
  typeFull: IdlTypeFull;
};

type IdlPdaBlobDiscriminant = "const" | "input";
type IdlPdaBlobContent = IdlPdaBlobConst | IdlPdaBlobInput;

/**
 * A discriminated union representing a single PDA seed that is either a pre-encoded
 * constant byte array or a named runtime input value.
 */
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
   * Dispatches to the appropriate visitor branch based on the seed's variant,
   * forwarding up to three extra parameters and returning the visitor's result.
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
 * Computes the raw byte representation of a PDA seed by resolving it against the given named inputs.
 * @param self - The {@link IdlPdaBlob} seed to compute.
 * @param inputs - Named input values used when the seed is an `input` variant.
 * @returns The computed seed bytes.
 */
export function idlPdaBlobCompute(
  self: IdlPdaBlob,
  inputs: Record<string, JsonValue>,
) {
  return self.traverse(computeVisitor, inputs, undefined);
}

/**
 * Parses a raw IDL PDA blob JSON value into an {@link IdlPdaBlob}, resolving constant or named-input variants.
 * @param pdaBlobValue - The raw JSON value describing the PDA seed.
 * @param typedefsIdls - A map of known typedef definitions for type resolution.
 * @returns The parsed {@link IdlPdaBlob}.
 */
export function idlPdaBlobParse(
  pdaBlobValue: JsonValue,
  typedefsIdls: Map<string, IdlTypedef>,
): IdlPdaBlob {
  const { input } = jsonDecoder(pdaBlobValue);
  const { value, typeFull: baseTypeFull } = idlUtilsBlobTypeValueParse(
    pdaBlobValue,
    typedefsIdls,
  );
  const typeFull = baseTypeFull ?? idlUtilsBlobValueGuessType(value);
  if (typeFull === null) {
    throw new ErrorStack(
      `Idl: Pda Blob: Unknown value type`,
      jsonPreview(value),
    );
  }
  if (input === null) {
    return IdlPdaBlob.const({
      bytes: idlTypeFullEncode(typeFull, value, false),
    });
  }
  return IdlPdaBlob.input({
    name: input,
    value: value,
    typeFull: typeFull,
  });
}

const computeVisitor = {
  const: (self: IdlPdaBlobConst) => {
    return self.bytes;
  },
  input: (self: IdlPdaBlobInput, inputs: Record<string, JsonValue>) => {
    return withErrorContext(`Idl: PDA Blob: Input: ${self.name}`, () => {
      const value = inputs[self.name];
      if (value !== undefined) {
        return idlTypeFullEncode(self.typeFull, value, false);
      }
      return idlTypeFullEncode(self.typeFull, self.value, false);
    });
  },
};

const jsonDecoder = jsonDecoderByType({
  null: () => ({ input: null }),
  boolean: () => ({ input: null }),
  number: () => ({ input: null }),
  string: () => ({ input: null }),
  array: () => ({ input: null }),
  object: jsonDecoderObjectToObject({
    input: jsonDecoderNullable(jsonCodecString.decoder),
  }),
});
