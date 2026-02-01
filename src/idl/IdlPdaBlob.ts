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
  const typeFull = idlTypeFlatHydrate(
    decoded.type ?? idlUtilsInferValueTypeFlat(decoded.value),
    new Map(),
    typedefsIdls,
  );
  const prefixed = decoded.prefixed ?? false;
  if (decoded.name === null) {
    return IdlPdaBlob.const({
      bytes: idlTypeFullEncode(typeFull, decoded.value, prefixed),
    });
  }
  return IdlPdaBlob.input({
    name: decoded.name,
    value: decoded.value,
    typeFull,
    prefixed,
  });
}

const jsonDecoder = jsonDecoderByType<{
  value: JsonValue;
  name: string | null;
  type: IdlTypeFlat | null;
  prefixed: boolean | null;
}>({
  object: jsonDecoderObjectToObject({
    value: jsonCodecValue.decoder,
    name: jsonDecoderNullable(jsonCodecString.decoder),
    type: jsonDecoderNullable(idlTypeFlatParse),
    prefixed: jsonDecoderNullable(jsonCodecBoolean.decoder),
  }),
  string: (string: string) => ({
    value: string,
    name: null,
    type: null,
    prefixed: null,
  }),
  array: (array: JsonArray) => ({
    value: array,
    name: null,
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
