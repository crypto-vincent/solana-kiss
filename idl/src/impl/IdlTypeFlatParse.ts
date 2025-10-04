import {
  JsonDecoder,
  JsonValue,
  camelCaseToSnakeCase,
  jsonAsArray,
  jsonAsNumber,
  jsonAsObject,
  jsonAsString,
  jsonDecoderArray,
  jsonDecoderArrayToObject,
  jsonDecoderAsEnum,
  jsonDecoderByKind,
  jsonDecoderObject,
  jsonDecoderObjectToMap,
  jsonDecoderOptional,
  jsonDecoderRemap,
  jsonTypeInteger,
  jsonTypeNumber,
  jsonTypeString,
  jsonTypeValue,
} from "solana-kiss-data";
import {
  IdlTypeFlat,
  IdlTypeFlatEnumVariant,
  IdlTypeFlatFields,
} from "./IdlTypeFlat";
import { IdlTypePrefix } from "./IdlTypePrefix";
import { IdlTypePrimitive } from "./IdlTypePrimitive";
import { idlUtilsBytesJsonDecoder } from "./IdlUtils";

export function idlTypeFlatParseIsPossible(value: JsonValue): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (jsonAsNumber(value) !== undefined) {
    return true;
  }
  if (jsonAsString(value) !== undefined) {
    return true;
  }
  if (jsonAsArray(value) !== undefined) {
    return true;
  }
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
    object.hasOwnProperty("padded") ||
    object.hasOwnProperty("blob") ||
    object.hasOwnProperty("value")
  ) {
    return true;
  }
  return false;
}

export function idlTypeFlatParse(value: JsonValue): IdlTypeFlat {
  return valueJsonDecoder(value);
}

export function idlTypeFlatFieldsParse(value: JsonValue): IdlTypeFlatFields {
  return fieldsJsonDecoder(value);
}

const arrayJsonDecoder = jsonDecoderRemap(
  jsonDecoderArrayToObject({
    items: idlTypeFlatParse,
    length: jsonDecoderOptional(idlTypeFlatParse),
  }),
  (array) => {
    if (array.length === undefined) {
      return IdlTypeFlat.vec({
        prefix: IdlTypePrefix.u32,
        items: array.items,
      });
    }
    return IdlTypeFlat.array({
      items: array.items,
      length: array.length,
    });
  },
);

const fieldsItemInfoJsonDecoder = jsonDecoderByKind({
  string: () => ({ name: undefined, docs: undefined }),
  array: () => ({ name: undefined, docs: undefined }),
  object: jsonDecoderObject({
    name: jsonDecoderOptional(jsonTypeString.decoder),
    docs: jsonTypeValue.decoder,
  }),
});
function fieldsItemJsonDecoder(value: JsonValue) {
  const info = fieldsItemInfoJsonDecoder(value);
  return {
    name: info.name,
    docs: info.docs,
    content: idlTypeFlatParse(value),
  };
}
const fieldsJsonDecoder = jsonDecoderByKind({
  undefined: () => IdlTypeFlatFields.nothing(),
  null: () => IdlTypeFlatFields.nothing(),
  array: jsonDecoderRemap(
    jsonDecoderArray(fieldsItemJsonDecoder),
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

const variantsArrayItemJsonDecoder = jsonDecoderByKind<{
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
    name: jsonDecoderOptional(jsonTypeString.decoder),
    code: jsonDecoderOptional(jsonTypeInteger.decoder),
    docs: jsonTypeValue.decoder,
    fields: fieldsJsonDecoder,
  }),
});
const variantsObjectValueJsonDecoder = jsonDecoderByKind<{
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
    code: jsonTypeInteger.decoder,
    docs: jsonTypeValue.decoder,
    fields: fieldsJsonDecoder,
  }),
});
const variantsJsonDecoder = jsonDecoderByKind({
  array: jsonDecoderRemap(
    jsonDecoderArray(variantsArrayItemJsonDecoder),
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
  object: jsonDecoderRemap(
    jsonDecoderObjectToMap(variantsObjectValueJsonDecoder),
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

const objectDefinedJsonDecoder = jsonDecoderRemap(
  jsonDecoderByKind({
    string: (string: string) => ({
      name: string,
      generics: undefined,
    }),
    object: jsonDecoderObject({
      name: jsonTypeString.decoder,
      generics: jsonDecoderOptional(jsonDecoderArray(idlTypeFlatParse)),
    }),
  }),
  (defined) =>
    IdlTypeFlat.defined({
      name: defined.name,
      generics: defined.generics ?? [],
    }),
);

function objectGenericJsonDecoder(value: JsonValue): IdlTypeFlat {
  const symbol = jsonTypeString.decoder(value);
  return IdlTypeFlat.generic({ symbol });
}

function objectOptionJsonDecoder(prefix: IdlTypePrefix) {
  return jsonDecoderRemap(idlTypeFlatParse, (content) =>
    IdlTypeFlat.option({ prefix, content }),
  );
}

function objectVecJsonDecoder(prefix: IdlTypePrefix) {
  return jsonDecoderRemap(idlTypeFlatParse, (items) =>
    IdlTypeFlat.vec({ prefix, items }),
  );
}

function objectStructJsonDecoder(value: JsonValue): IdlTypeFlat {
  const fields = fieldsJsonDecoder(value);
  return IdlTypeFlat.struct({ fields });
}

function objectVariantsJsonDecoder(prefix: IdlTypePrefix) {
  return jsonDecoderRemap(variantsJsonDecoder, (variants) =>
    IdlTypeFlat.enum({ prefix, variants }),
  );
}

const objectPaddedInfoJsonDecoder = jsonDecoderObject({
  before: jsonDecoderOptional(jsonTypeNumber.decoder),
  min_size: jsonDecoderOptional(jsonTypeNumber.decoder),
  after: jsonDecoderOptional(jsonTypeNumber.decoder),
});
function objectPaddedJsonDecoder(value: JsonValue): IdlTypeFlat {
  const info = objectPaddedInfoJsonDecoder(value);
  return IdlTypeFlat.padded({
    before: info.before,
    minSize: info.min_size,
    after: info.after,
    content: idlTypeFlatParseIsPossible(value)
      ? idlTypeFlatParse(value)
      : IdlTypeFlat.structNothing(),
  });
}

const objectBlobInfoJsonDecoder = jsonDecoderObject({
  bytes: idlUtilsBytesJsonDecoder,
});
function objectBlobJsonDecoder(value: JsonValue): IdlTypeFlat {
  const info = objectBlobInfoJsonDecoder(value);
  return IdlTypeFlat.blob({ bytes: info.bytes });
}

function objectConstJsonDecoder(value: JsonValue): IdlTypeFlat {
  const literal = jsonTypeString.decoder(value);
  return IdlTypeFlat.const({ literal: Number(literal) });
}

const objectJsonDecoder: JsonDecoder<IdlTypeFlat> = jsonDecoderAsEnum({
  type: idlTypeFlatParse,
  defined: objectDefinedJsonDecoder,
  generic: objectGenericJsonDecoder,
  option: objectOptionJsonDecoder(IdlTypePrefix.u8),
  option8: objectOptionJsonDecoder(IdlTypePrefix.u8),
  option16: objectOptionJsonDecoder(IdlTypePrefix.u16),
  option32: objectOptionJsonDecoder(IdlTypePrefix.u32),
  option64: objectOptionJsonDecoder(IdlTypePrefix.u64),
  option128: objectOptionJsonDecoder(IdlTypePrefix.u128),
  vec: objectVecJsonDecoder(IdlTypePrefix.u32),
  vec8: objectVecJsonDecoder(IdlTypePrefix.u8),
  vec16: objectVecJsonDecoder(IdlTypePrefix.u16),
  vec32: objectVecJsonDecoder(IdlTypePrefix.u32),
  vec64: objectVecJsonDecoder(IdlTypePrefix.u64),
  vec128: objectVecJsonDecoder(IdlTypePrefix.u128),
  array: arrayJsonDecoder,
  fields: objectStructJsonDecoder,
  variants: objectVariantsJsonDecoder(IdlTypePrefix.u8),
  variants8: objectVariantsJsonDecoder(IdlTypePrefix.u8),
  variants16: objectVariantsJsonDecoder(IdlTypePrefix.u16),
  variants32: objectVariantsJsonDecoder(IdlTypePrefix.u32),
  variants64: objectVariantsJsonDecoder(IdlTypePrefix.u64),
  variants128: objectVariantsJsonDecoder(IdlTypePrefix.u128),
  padded: objectPaddedJsonDecoder,
  blob: objectBlobJsonDecoder,
  value: objectConstJsonDecoder,
});

const presetsByName = new Map<string, IdlTypeFlat>([
  ["publicKey", IdlTypeFlat.primitive(IdlTypePrimitive.pubkey)],
  ["string", IdlTypeFlat.string({ prefix: IdlTypePrefix.u32 })],
  ["string8", IdlTypeFlat.string({ prefix: IdlTypePrefix.u8 })],
  ["string16", IdlTypeFlat.string({ prefix: IdlTypePrefix.u16 })],
  ["string32", IdlTypeFlat.string({ prefix: IdlTypePrefix.u32 })],
  ["string64", IdlTypeFlat.string({ prefix: IdlTypePrefix.u64 })],
  ["string128", IdlTypeFlat.string({ prefix: IdlTypePrefix.u128 })],
  [
    "bytes",
    IdlTypeFlat.vec({
      prefix: IdlTypePrefix.u32,
      items: IdlTypeFlat.primitive(IdlTypePrimitive.u8),
    }),
  ],
]);
function stringJsonDecoder(string: string): IdlTypeFlat {
  const preset = presetsByName.get(string);
  if (preset !== undefined) {
    return preset;
  }
  const primitive = IdlTypePrimitive.primitivesByName.get(string);
  if (primitive !== undefined) {
    return IdlTypeFlat.primitive(primitive);
  }
  return IdlTypeFlat.defined({ name: string, generics: [] });
}

const valueJsonDecoder: JsonDecoder<IdlTypeFlat> = jsonDecoderByKind({
  null: () => IdlTypeFlat.structNothing(),
  number: (number: number) => IdlTypeFlat.const({ literal: number }),
  string: stringJsonDecoder,
  array: arrayJsonDecoder,
  object: objectJsonDecoder,
});
