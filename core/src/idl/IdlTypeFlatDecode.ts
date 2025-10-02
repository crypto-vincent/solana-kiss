import { camelCaseToSnakeCase } from "../data/Casing";
import {
  JsonArray,
  JsonDecode,
  jsonDecodeNumber,
  jsonDecoderArray,
  jsonDecoderArrayToTuple,
  jsonDecoderByKind,
  jsonDecoderEnum,
  jsonDecoderMap,
  jsonDecoderMerged,
  jsonDecoderObject,
  jsonDecoderObjectToMap,
  jsonDecoderOptional,
  jsonDecoderRecursive,
  jsonDecodeString,
  jsonDecodeValue,
  JsonObject,
  JsonValue,
} from "../data/Json";
import {
  IdlTypeFlat,
  IdlTypeFlatEnumVariant,
  IdlTypeFlatFields,
} from "./IdlTypeFlat";
import { IdlTypePrefix } from "./IdlTypePrefix";
import { IdlTypePrimitive } from "./IdlTypePrimitive";

export function idlTypeFlatParseObjectIsPossible(
  typeObject: JsonObject,
): boolean {
  // TODO - this also looks like an enum honestly
  if (
    typeObject.hasOwnProperty("type") ||
    typeObject.hasOwnProperty("defined") ||
    typeObject.hasOwnProperty("generic") ||
    typeObject.hasOwnProperty("option") ||
    typeObject.hasOwnProperty("option8") ||
    typeObject.hasOwnProperty("option16") ||
    typeObject.hasOwnProperty("option32") ||
    typeObject.hasOwnProperty("option64") ||
    typeObject.hasOwnProperty("option128") ||
    typeObject.hasOwnProperty("vec") ||
    typeObject.hasOwnProperty("vec8") ||
    typeObject.hasOwnProperty("vec16") ||
    typeObject.hasOwnProperty("vec32") ||
    typeObject.hasOwnProperty("vec64") ||
    typeObject.hasOwnProperty("vec128") ||
    typeObject.hasOwnProperty("array") ||
    typeObject.hasOwnProperty("fields") ||
    typeObject.hasOwnProperty("variants") ||
    typeObject.hasOwnProperty("variants8") ||
    typeObject.hasOwnProperty("variants16") ||
    typeObject.hasOwnProperty("variants32") ||
    typeObject.hasOwnProperty("variants64") ||
    typeObject.hasOwnProperty("variants128") ||
    typeObject.hasOwnProperty("padded")
  ) {
    return true;
  }
  return false;
}

const bigintDecode = jsonDecoderByKind({
  number: (number: number) => BigInt(number),
  string: (string: string) => BigInt(string),
});

const arrayDecode = jsonDecoderMap(
  jsonDecoderArrayToTuple([
    jsonDecoderRecursive(() => idlTypeFlatDecode),
    jsonDecoderOptional(jsonDecoderRecursive(() => idlTypeFlatDecode)),
  ]),
  (array) => {
    if (array[1] === undefined) {
      return IdlTypeFlat.vec({
        prefix: IdlTypePrefix.U32,
        items: array[0],
      });
    }
    return IdlTypeFlat.array({
      items: array[0],
      length: array[1],
    });
  },
);

const fieldsItemDecode = jsonDecoderMerged(
  jsonDecoderByKind({
    string: () => ({ name: undefined, docs: undefined }),
    object: jsonDecoderObject({
      name: jsonDecoderOptional(jsonDecodeString),
      docs: jsonDecodeValue,
    }),
  }),
  jsonDecoderRecursive(() => idlTypeFlatDecode),
  (fieldMeta, fieldType) => ({
    name: fieldMeta.name,
    docs: fieldMeta.docs,
    content: fieldType,
  }),
);

const fieldsDecode = jsonDecoderByKind({
  undefined: () => IdlTypeFlatFields.nothing(),
  array: (array: JsonArray) => {
    if (array.length === 0) {
      return IdlTypeFlatFields.nothing();
    }
    let named = false;
    const fields = array.map((fieldValue, fieldIndex) => {
      const field = fieldsItemDecode(fieldValue);
      if (field.name !== undefined) {
        named = true;
      }
      return {
        name: camelCaseToSnakeCase(field.name ?? fieldIndex.toString()),
        docs: field.docs,
        content: field.content,
      };
    });
    if (named) {
      return IdlTypeFlatFields.named(fields);
    }
    return IdlTypeFlatFields.unnamed(fields);
  },
});

const objectDefinedDecode = jsonDecoderMap(
  jsonDecoderByKind({
    string: (string: string) => ({
      name: string,
      generics: undefined,
    }),
    object: jsonDecoderObject({
      name: jsonDecodeString,
      generics: jsonDecoderOptional(
        jsonDecoderArray(jsonDecoderRecursive(() => idlTypeFlatDecode)),
      ),
    }),
  }),
  (defined) =>
    IdlTypeFlat.defined({
      name: defined.name,
      generics: defined.generics ?? [],
    }),
);

const objectPaddedDecode = jsonDecoderMap(
  jsonDecoderObject(
    {
      before: jsonDecoderOptional(jsonDecodeNumber),
      minSize: jsonDecoderOptional(jsonDecodeNumber),
      after: jsonDecoderOptional(jsonDecodeNumber),
      content: jsonDecoderRecursive(() => idlTypeFlatDecode),
    },
    { minSize: "min_size" },
  ),
  IdlTypeFlat.padded,
);

const objectDecode: JsonDecode<IdlTypeFlat> = jsonDecoderEnum({
  type: jsonDecoderRecursive(() => idlTypeFlatDecode),
  defined: objectDefinedDecode,
  generic: jsonDecoderMap(jsonDecodeString, (string: string) =>
    IdlTypeFlat.generic({ symbol: string }),
  ),
  option: objectOptionDecoder(IdlTypePrefix.U8),
  option8: objectOptionDecoder(IdlTypePrefix.U8),
  option16: objectOptionDecoder(IdlTypePrefix.U16),
  option32: objectOptionDecoder(IdlTypePrefix.U32),
  option64: objectOptionDecoder(IdlTypePrefix.U64),
  option128: objectOptionDecoder(IdlTypePrefix.U128),
  vec: objectVecDecoder(IdlTypePrefix.U32),
  vec8: objectVecDecoder(IdlTypePrefix.U8),
  vec16: objectVecDecoder(IdlTypePrefix.U16),
  vec32: objectVecDecoder(IdlTypePrefix.U32),
  vec64: objectVecDecoder(IdlTypePrefix.U64),
  vec128: objectVecDecoder(IdlTypePrefix.U128),
  array: arrayDecode,
  fields: jsonDecoderMap(fieldsDecode, (fields: IdlTypeFlatFields) =>
    IdlTypeFlat.struct({ fields }),
  ),
  variants: objectVariantsDecoder(IdlTypePrefix.U8),
  variants8: objectVariantsDecoder(IdlTypePrefix.U8),
  variants16: objectVariantsDecoder(IdlTypePrefix.U16),
  variants32: objectVariantsDecoder(IdlTypePrefix.U32),
  variants64: objectVariantsDecoder(IdlTypePrefix.U64),
  variants128: objectVariantsDecoder(IdlTypePrefix.U128),
  padded: objectPaddedDecode,
  value: jsonDecoderMap(jsonDecodeString, (string: string) =>
    IdlTypeFlat.const({ literal: Number(string) }),
  ),
});

const stringToPreset = new Map<string, IdlTypeFlat>([
  [
    "bytes",
    IdlTypeFlat.vec({
      prefix: IdlTypePrefix.U32,
      items: IdlTypeFlat.primitive(IdlTypePrimitive.U8),
    }),
  ],
  ["publicKey", IdlTypeFlat.primitive(IdlTypePrimitive.Pubkey)],
  ["string", IdlTypeFlat.string({ prefix: IdlTypePrefix.U32 })],
  ["string8", IdlTypeFlat.string({ prefix: IdlTypePrefix.U8 })],
  ["string16", IdlTypeFlat.string({ prefix: IdlTypePrefix.U16 })],
  ["string32", IdlTypeFlat.string({ prefix: IdlTypePrefix.U32 })],
  ["string64", IdlTypeFlat.string({ prefix: IdlTypePrefix.U64 })],
  ["string128", IdlTypeFlat.string({ prefix: IdlTypePrefix.U128 })],
]);

export const idlTypeFlatDecode: JsonDecode<IdlTypeFlat> = jsonDecoderByKind({
  number: (number: number) => {
    return IdlTypeFlat.const({ literal: number });
  },
  string: (typeString: string) => {
    const preset = stringToPreset.get(typeString);
    if (preset !== undefined) {
      return preset;
    }
    const primitive = IdlTypePrimitive.primitivesByName.get(typeString);
    if (primitive !== undefined) {
      return IdlTypeFlat.primitive(primitive);
    }
    return IdlTypeFlat.defined({
      name: typeString,
      generics: [],
    });
  },
  array: arrayDecode,
  object: objectDecode,
});

function objectOptionDecoder(prefix: IdlTypePrefix): JsonDecode<IdlTypeFlat> {
  return jsonDecoderMap(
    jsonDecoderRecursive(() => idlTypeFlatDecode),
    (content) => IdlTypeFlat.option({ prefix, content }),
  );
}
function objectVecDecoder(prefix: IdlTypePrefix): JsonDecode<IdlTypeFlat> {
  return jsonDecoderMap(
    jsonDecoderRecursive(() => idlTypeFlatDecode),
    (items) => IdlTypeFlat.vec({ prefix, items }),
  );
}
function objectVariantsDecoder(prefix: IdlTypePrefix): JsonDecode<IdlTypeFlat> {
  return jsonDecoderMap(variantsDecode, (variants) =>
    IdlTypeFlat.enum({ prefix, variants }),
  );
}

const variantsArrayItemDecode = jsonDecoderByKind<{
  name: string | undefined;
  code: bigint | undefined;
  docs: JsonValue;
  fields: IdlTypeFlatFields;
}>({
  number: (number: number) => ({
    name: undefined,
    code: BigInt(number),
    docs: undefined,
    fields: IdlTypeFlatFields.nothing(),
  }),
  string: (string: string) => ({
    name: string,
    code: undefined,
    docs: undefined,
    fields: IdlTypeFlatFields.nothing(),
  }),
  object: jsonDecoderObject({
    name: jsonDecoderOptional(jsonDecodeString),
    code: jsonDecoderOptional(bigintDecode),
    docs: jsonDecodeValue,
    fields: fieldsDecode,
  }),
});

const variantsObjectValueDecode = jsonDecoderByKind<{
  code: bigint;
  docs: JsonValue;
  fields: IdlTypeFlatFields;
}>({
  number: (number: number) => ({
    code: BigInt(number),
    docs: undefined,
    fields: IdlTypeFlatFields.nothing(),
  }),
  string: (string: string) => ({
    code: BigInt(string),
    docs: undefined,
    fields: IdlTypeFlatFields.nothing(),
  }),
  object: jsonDecoderObject({
    code: bigintDecode,
    docs: jsonDecodeValue,
    fields: fieldsDecode,
  }),
});

const variantsDecode = jsonDecoderByKind({
  array: jsonDecoderMap(
    jsonDecoderArray(variantsArrayItemDecode),
    (variantsArray) =>
      variantsArray.map((variantInfo, variantIndex) => {
        const code = variantInfo.code ?? BigInt(variantIndex);
        return {
          name: variantInfo.name ?? String(code),
          code,
          docs: variantInfo.docs,
          fields: variantInfo.fields,
        };
      }),
  ),
  object: jsonDecoderMap(
    jsonDecoderObjectToMap(variantsObjectValueDecode),
    (variantsMap) => {
      const variants = new Array<IdlTypeFlatEnumVariant>();
      for (const [variantName, variantInfo] of variantsMap) {
        variants.push({
          name: variantName,
          code: variantInfo.code,
          docs: variantInfo.docs,
          fields: variantInfo.fields,
        });
      }
      return variants;
    },
  ),
});
