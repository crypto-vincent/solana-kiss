import { camelCaseToSnakeCase } from "../data/Casing";
import {
  jsonAsObject,
  JsonDecode,
  jsonDecoderArray,
  jsonDecoderArrayToTuple,
  jsonDecoderByKind,
  jsonDecoderEnum,
  jsonDecoderMap,
  jsonDecoderObject,
  jsonDecoderObjectToMap,
  jsonDecoderOptional,
  jsonDecoderRecursive,
  jsonDecodeValue,
  jsonExpectNumber,
  jsonExpectString,
  JsonValue,
} from "../data/Json";
import {
  IdlTypeFlat,
  IdlTypeFlatEnumVariant,
  IdlTypeFlatFields,
} from "./IdlTypeFlat";
import { IdlTypePrefix } from "./IdlTypePrefix";
import { IdlTypePrimitive } from "./IdlTypePrimitive";
import { idlUtilsIntegerJsonDecode } from "./IdlUtils";

export function idlTypeFlatParseIsPossible(value: JsonValue): boolean {
  const object = jsonAsObject(value);
  if (object === undefined) {
    return false;
  }
  if (
    object.hasOwnProperty("type") ||
    object.hasOwnProperty("defined") ||
    object.hasOwnProperty("generic") ||
    object.hasOwnProperty("option") ||
    object.hasOwnProperty("option8") ||
    object.hasOwnProperty("option16") ||
    object.hasOwnProperty("option32") ||
    object.hasOwnProperty("option64") ||
    object.hasOwnProperty("option128") ||
    object.hasOwnProperty("vec") ||
    object.hasOwnProperty("vec8") ||
    object.hasOwnProperty("vec16") ||
    object.hasOwnProperty("vec32") ||
    object.hasOwnProperty("vec64") ||
    object.hasOwnProperty("vec128") ||
    object.hasOwnProperty("array") ||
    object.hasOwnProperty("fields") ||
    object.hasOwnProperty("variants") ||
    object.hasOwnProperty("variants8") ||
    object.hasOwnProperty("variants16") ||
    object.hasOwnProperty("variants32") ||
    object.hasOwnProperty("variants64") ||
    object.hasOwnProperty("variants128") ||
    object.hasOwnProperty("padded")
  ) {
    return true;
  }
  return false;
}

export function idlTypeFlatParse(value: JsonValue): IdlTypeFlat {
  return valueJsonDecode(value);
}

export function idlTypeFlatFieldsParse(value: JsonValue): IdlTypeFlatFields {
  return fieldsJsonDecode(value);
}

const arrayJsonDecode = jsonDecoderMap(
  jsonDecoderArrayToTuple([
    jsonDecoderRecursive(() => valueJsonDecode),
    jsonDecoderOptional(jsonDecoderRecursive(() => valueJsonDecode)),
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

const fieldsItemInfoJsonDecode = jsonDecoderByKind({
  string: () => ({ name: undefined, docs: undefined }),
  array: () => ({ name: undefined, docs: undefined }),
  object: jsonDecoderObject({
    name: jsonDecoderOptional(jsonExpectString),
    docs: jsonDecodeValue,
  }),
});
function fieldsItemJsonDecode(value: JsonValue) {
  const info = fieldsItemInfoJsonDecode(value);
  return {
    name: info.name,
    docs: info.docs,
    content: idlTypeFlatParse(value),
  };
}
const fieldsJsonDecode = jsonDecoderByKind({
  undefined: () => IdlTypeFlatFields.nothing(),
  array: jsonDecoderMap(
    jsonDecoderArray(fieldsItemJsonDecode),
    (fieldsInfos) => {
      if (fieldsInfos.length === 0) {
        return IdlTypeFlatFields.nothing();
      }
      let named = false;
      const fields = fieldsInfos.map((fieldInfo, fieldIndex) => {
        if (fieldInfo.name !== undefined) {
          named = true;
        }
        return {
          name: camelCaseToSnakeCase(fieldInfo.name ?? fieldIndex.toString()),
          docs: fieldInfo.docs,
          content: fieldInfo.content,
        };
      });
      if (named) {
        return IdlTypeFlatFields.named(fields);
      }
      return IdlTypeFlatFields.unnamed(
        fields.map((field) => ({
          docs: field.docs,
          content: field.content,
        })),
      );
    },
  ),
});

const variantsArrayItemJsonDecode = jsonDecoderByKind<{
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
    name: jsonDecoderOptional(jsonExpectString),
    code: jsonDecoderOptional(idlUtilsIntegerJsonDecode),
    docs: jsonDecodeValue,
    fields: fieldsJsonDecode,
  }),
});
const variantsObjectValueJsonDecode = jsonDecoderByKind<{
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
    code: idlUtilsIntegerJsonDecode,
    docs: jsonDecodeValue,
    fields: fieldsJsonDecode,
  }),
});
const variantsJsonDecode = jsonDecoderByKind({
  array: jsonDecoderMap(
    jsonDecoderArray(variantsArrayItemJsonDecode),
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
    jsonDecoderObjectToMap(variantsObjectValueJsonDecode),
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

const objectDefinedJsonDecode = jsonDecoderMap(
  jsonDecoderByKind({
    string: (string: string) => ({
      name: string,
      generics: undefined,
    }),
    object: jsonDecoderObject({
      name: jsonExpectString,
      generics: jsonDecoderOptional(
        jsonDecoderArray(jsonDecoderRecursive(() => valueJsonDecode)),
      ),
    }),
  }),
  (defined) =>
    IdlTypeFlat.defined({
      name: defined.name,
      generics: defined.generics ?? [],
    }),
);

function objectOptionJsonDecoder(
  prefix: IdlTypePrefix,
): JsonDecode<IdlTypeFlat> {
  return jsonDecoderMap(
    jsonDecoderRecursive(() => valueJsonDecode),
    (content) => IdlTypeFlat.option({ prefix, content }),
  );
}

function objectVecJsonDecoder(prefix: IdlTypePrefix): JsonDecode<IdlTypeFlat> {
  return jsonDecoderMap(
    jsonDecoderRecursive(() => valueJsonDecode),
    (items) => IdlTypeFlat.vec({ prefix, items }),
  );
}

function objectVariantsJsonDecoder(
  prefix: IdlTypePrefix,
): JsonDecode<IdlTypeFlat> {
  return jsonDecoderMap(variantsJsonDecode, (variants) =>
    IdlTypeFlat.enum({ prefix, variants }),
  );
}

const objectPaddedInfoJsonDecode = jsonDecoderObject({
  before: jsonDecoderOptional(jsonExpectNumber),
  min_size: jsonDecoderOptional(jsonExpectNumber),
  after: jsonDecoderOptional(jsonExpectNumber),
});
function objectPaddedJsonDecode(value: JsonValue): IdlTypeFlat {
  const info = objectPaddedInfoJsonDecode(value);
  return IdlTypeFlat.padded({
    before: info.before,
    minSize: info.min_size,
    after: info.after,
    content: idlTypeFlatParseIsPossible(value)
      ? idlTypeFlatParse(value)
      : IdlTypeFlat.structNothing(),
  });
}

const objectJsonDecode: JsonDecode<IdlTypeFlat> = jsonDecoderEnum({
  type: jsonDecoderRecursive(() => valueJsonDecode),
  defined: objectDefinedJsonDecode,
  generic: jsonDecoderMap(jsonExpectString, (string: string) =>
    IdlTypeFlat.generic({ symbol: string }),
  ),
  option: objectOptionJsonDecoder(IdlTypePrefix.U8),
  option8: objectOptionJsonDecoder(IdlTypePrefix.U8),
  option16: objectOptionJsonDecoder(IdlTypePrefix.U16),
  option32: objectOptionJsonDecoder(IdlTypePrefix.U32),
  option64: objectOptionJsonDecoder(IdlTypePrefix.U64),
  option128: objectOptionJsonDecoder(IdlTypePrefix.U128),
  vec: objectVecJsonDecoder(IdlTypePrefix.U32),
  vec8: objectVecJsonDecoder(IdlTypePrefix.U8),
  vec16: objectVecJsonDecoder(IdlTypePrefix.U16),
  vec32: objectVecJsonDecoder(IdlTypePrefix.U32),
  vec64: objectVecJsonDecoder(IdlTypePrefix.U64),
  vec128: objectVecJsonDecoder(IdlTypePrefix.U128),
  array: arrayJsonDecode,
  fields: jsonDecoderMap(fieldsJsonDecode, (fields: IdlTypeFlatFields) =>
    IdlTypeFlat.struct({ fields }),
  ),
  variants: objectVariantsJsonDecoder(IdlTypePrefix.U8),
  variants8: objectVariantsJsonDecoder(IdlTypePrefix.U8),
  variants16: objectVariantsJsonDecoder(IdlTypePrefix.U16),
  variants32: objectVariantsJsonDecoder(IdlTypePrefix.U32),
  variants64: objectVariantsJsonDecoder(IdlTypePrefix.U64),
  variants128: objectVariantsJsonDecoder(IdlTypePrefix.U128),
  padded: objectPaddedJsonDecode,
  value: jsonDecoderMap(jsonExpectString, (string: string) =>
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

const valueJsonDecode: JsonDecode<IdlTypeFlat> = jsonDecoderByKind({
  number: (number: number) => {
    return IdlTypeFlat.const({ literal: number });
  },
  string: (string: string) => {
    const preset = stringToPreset.get(string);
    if (preset !== undefined) {
      return preset;
    }
    const primitive = IdlTypePrimitive.primitivesByName.get(string);
    if (primitive !== undefined) {
      return IdlTypeFlat.primitive(primitive);
    }
    return IdlTypeFlat.defined({
      name: string,
      generics: [],
    });
  },
  array: arrayJsonDecode,
  object: objectJsonDecode,
});
