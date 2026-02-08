import {
  JsonArray,
  jsonCodecBoolean,
  jsonCodecString,
  jsonCodecValue,
  jsonDecoderByType,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
  JsonValue,
} from "../data/Json";
import { IdlPdaInputs } from "./IdlPda";
import { IdlTypedef } from "./IdlTypedef";
import { IdlTypeFlat } from "./IdlTypeFlat";
import { idlTypeFlatHydrate } from "./IdlTypeFlatHydrate";
import { idlTypeFlatParse } from "./IdlTypeFlatParse";
import { IdlTypeFull } from "./IdlTypeFull";
import { idlTypeFullEncode } from "./IdlTypeFullEncode";
import { idlUtilsInferValueTypeFlat } from "./IdlUtils";

export type IdlPdaBlobConst = {
  bytes: Uint8Array;
};
export type IdlPdaBlobInput = {
  name: string;
  value: JsonValue;
  typeFull: IdlTypeFull;
  prefixed: boolean;
};

type IdlPdaBlobDiscriminant = "const" | "input";
type IdlPdaBlobContent = IdlPdaBlobConst | IdlPdaBlobInput;

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

  public static const(value: IdlPdaBlobConst): IdlPdaBlob {
    return new IdlPdaBlob("const", value);
  }
  public static input(value: IdlPdaBlobInput): IdlPdaBlob {
    return new IdlPdaBlob("input", value);
  }

  public traverse<P1, P2, P3, T>(
    visitor: {
      const: (value: IdlPdaBlobConst, p1: P1, p2: P2, p3: P3) => T;
      input: (value: IdlPdaBlobInput, p1: P1, p2: P2, p3: P3) => T;
    },
    p1: P1,
    p2: P2,
    p3: P3,
  ): T {
    return visitor[this.discriminant](this.content as any, p1, p2, p3);
  }
}

export function idlPdaBlobCompute(self: IdlPdaBlob, inputs: IdlPdaInputs) {
  return self.traverse(computeVisitor, inputs, undefined, undefined);
}

export function idlPdaBlobParse(
  pdaBlobValue: JsonValue,
  typedefsIdls: Map<string, IdlTypedef>,
): IdlPdaBlob {
  const decoded = jsonDecoder(pdaBlobValue);
  if (decoded.input === null) {
    if (decoded.value !== null) {
      return parseConst(
        decoded.value,
        decoded.type,
        decoded.prefixed,
        typedefsIdls,
      );
    }
    return parseConst(pdaBlobValue, null, null, typedefsIdls);
  }
  return parseInput(
    decoded.input,
    decoded.value,
    decoded.type,
    decoded.prefixed,
    typedefsIdls,
  );
}

function parseConst(
  pdaBlobValue: JsonValue,
  pdaBlobType: IdlTypeFlat | null,
  pdaBlobPrefixed: boolean | null,
  typedefsIdls: Map<string, IdlTypedef>,
): IdlPdaBlob {
  const typeFull = idlTypeFlatHydrate(
    pdaBlobType ?? idlUtilsInferValueTypeFlat(pdaBlobValue),
    new Map(),
    typedefsIdls,
  );
  const bytes = idlTypeFullEncode(
    typeFull,
    pdaBlobValue,
    pdaBlobPrefixed === true,
  );
  return IdlPdaBlob.const({ bytes });
}

function parseInput(
  pdaBlobInput: string,
  pdaBlobValue: JsonValue,
  pdaBlobType: IdlTypeFlat | null,
  pdaBlobPrefixed: boolean | null,
  typedefsIdls: Map<string, IdlTypedef>,
): IdlPdaBlob {
  const typeFull = idlTypeFlatHydrate(
    pdaBlobType ?? idlUtilsInferValueTypeFlat(pdaBlobValue),
    new Map(),
    typedefsIdls,
  );
  return IdlPdaBlob.input({
    name: pdaBlobInput,
    value: pdaBlobValue,
    typeFull,
    prefixed: pdaBlobPrefixed === true,
  });
}

const jsonDecoder = jsonDecoderByType<{
  value: JsonValue;
  input: string | null;
  type: IdlTypeFlat | null;
  prefixed: boolean | null;
}>({
  object: jsonDecoderObjectToObject({
    value: jsonCodecValue.decoder,
    input: jsonDecoderNullable(jsonCodecString.decoder),
    type: jsonDecoderNullable(idlTypeFlatParse),
    prefixed: jsonDecoderNullable(jsonCodecBoolean.decoder),
  }),
  string: (string: string) => ({
    value: string,
    input: null,
    type: null,
    prefixed: null,
  }),
  array: (array: JsonArray) => ({
    value: array,
    input: null,
    type: null,
    prefixed: null,
  }),
});

const computeVisitor = {
  const: (self: IdlPdaBlobConst) => {
    return self.bytes;
  },
  input: (self: IdlPdaBlobInput, inputs: IdlPdaInputs) => {
    const input = inputs[self.name];
    if (input === undefined) {
      return idlTypeFullEncode(self.typeFull, self.value, self.prefixed);
    }
    return idlTypeFullEncode(self.typeFull, input, self.prefixed);
  },
};
