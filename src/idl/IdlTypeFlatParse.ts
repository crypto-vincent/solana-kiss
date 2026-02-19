import { casingLosslessConvertToSnake } from "../data/Casing";
import {
  JsonDecoder,
  JsonValue,
  jsonAsArray,
  jsonAsBoolean,
  jsonAsNumber,
  jsonAsObject,
  jsonAsString,
  jsonCodecBigInt,
  jsonCodecNumber,
  jsonCodecString,
  jsonCodecValue,
  jsonDecoderArrayToArray,
  jsonDecoderArrayToObject,
  jsonDecoderByType,
  jsonDecoderConst,
  jsonDecoderInParallel,
  jsonDecoderNullable,
  jsonDecoderObjectToMap,
  jsonDecoderObjectToObject,
  jsonDecoderOneOfKeys,
  jsonDecoderWrapped,
} from "../data/Json";
import { IdlDocs, idlDocsParse } from "./IdlDocs";
import {
  IdlTypeFlat,
  IdlTypeFlatEnumVariant,
  IdlTypeFlatFields,
} from "./IdlTypeFlat";
import { IdlTypePrefix } from "./IdlTypePrefix";
import { IdlTypePrimitive, idlTypePrimitiveByName } from "./IdlTypePrimitive";
import { idlUtilsBytesJsonDecoder, idlUtilsJsonRustedParse } from "./IdlUtils";

/** Returns true if a JSON value can be a flat IDL type. */
export function idlTypeFlatParseIsPossible(value: JsonValue): boolean {
  if (value === null) {
    return true;
  }
  if (jsonAsBoolean(value) !== undefined) {
    return false;
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
  for (const objectKey in object) {
    const objectValue = object[objectKey];
    if (objectValue === undefined) {
      continue;
    }
    if (objectJsonDecoderKeys.has(objectKey)) {
      return true;
    }
  }
  return false;
}

/** Parses a flat IDL type from JSON (string, array, or object). */
export function idlTypeFlatParse(value: JsonValue): IdlTypeFlat {
  return valueJsonDecoder(value);
}

/** Parses flat IDL type fields from a JSON value. */
export function idlTypeFlatFieldsParse(value: JsonValue): IdlTypeFlatFields {
  return fieldsJsonDecoder(value);
}

const arrayJsonDecoder = jsonDecoderWrapped(
  jsonDecoderArrayToObject({
    items: idlTypeFlatParse,
    length: jsonDecoderNullable(idlTypeFlatParse),
  }),
  (array) => {
    if (array.length === null) {
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

const fieldsItemJsonDecoder = jsonDecoderInParallel({
  meta: jsonDecoderByType({
    null: () => ({ name: null, docs: undefined }),
    string: () => ({ name: null, docs: undefined }),
    array: () => ({ name: null, docs: undefined }),
    object: jsonDecoderObjectToObject({
      name: jsonDecoderNullable(jsonCodecString.decoder),
      docs: idlDocsParse,
    }),
  }),
  type: idlTypeFlatParse,
});
const fieldsJsonDecoder = jsonDecoderByType({
  null: () => IdlTypeFlatFields.nothing(),
  array: jsonDecoderWrapped(
    jsonDecoderArrayToArray(fieldsItemJsonDecoder),
    (fieldsItems) => {
      if (fieldsItems.length === 0) {
        return IdlTypeFlatFields.nothing();
      }
      let named = false;
      const fields = fieldsItems.map(({ meta, type }, fieldIndex) => {
        if (meta.name !== null) {
          named = true;
        }
        return {
          name: casingLosslessConvertToSnake(
            meta.name ?? fieldIndex.toString(),
          ),
          docs: meta.docs,
          content: type,
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

const variantsArrayItemJsonDecoder = jsonDecoderByType<{
  name: string | null;
  code: bigint | null;
  docs: IdlDocs;
  fields: IdlTypeFlatFields;
}>({
  number: (number) => ({
    name: null,
    code: BigInt(number),
    docs: undefined,
    fields: IdlTypeFlatFields.nothing(),
  }),
  string: (string) => ({
    name: string,
    code: null,
    docs: undefined,
    fields: IdlTypeFlatFields.nothing(),
  }),
  array: (array) => ({
    name: null,
    code: null,
    docs: undefined,
    fields: fieldsJsonDecoder(array),
  }),
  object: jsonDecoderObjectToObject({
    name: jsonDecoderNullable(jsonCodecString.decoder),
    code: jsonDecoderNullable(jsonCodecBigInt.decoder),
    docs: idlDocsParse,
    fields: fieldsJsonDecoder,
  }),
});
const variantsObjectValueJsonDecoder = jsonDecoderByType<{
  code: bigint;
  docs: IdlDocs;
  fields: IdlTypeFlatFields;
}>({
  number: (number) => ({
    code: BigInt(number),
    docs: undefined,
    fields: IdlTypeFlatFields.nothing(),
  }),
  string: (string) => ({
    code: BigInt(string),
    docs: undefined,
    fields: IdlTypeFlatFields.nothing(),
  }),
  object: jsonDecoderObjectToObject({
    code: jsonCodecBigInt.decoder,
    docs: idlDocsParse,
    fields: fieldsJsonDecoder,
  }),
});
const variantsJsonDecoder = jsonDecoderByType({
  array: jsonDecoderWrapped(
    jsonDecoderArrayToArray(variantsArrayItemJsonDecoder),
    (variantsArray) =>
      variantsArray.map((variant) => ({
        name: variant.name ?? undefined,
        code: variant.code ?? undefined,
        docs: variant.docs,
        fields: variant.fields,
      })),
  ),
  object: jsonDecoderWrapped(
    jsonDecoderObjectToMap({
      keyDecoder: (key) => key,
      valueDecoder: variantsObjectValueJsonDecoder,
    }),
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

const objectDefinedJsonDecoder = jsonDecoderWrapped(
  jsonDecoderByType({
    string: (string) => ({
      name: string,
      generics: null,
    }),
    object: jsonDecoderObjectToObject({
      name: jsonCodecString.decoder,
      generics: jsonDecoderNullable(jsonDecoderArrayToArray(idlTypeFlatParse)),
    }),
  }),
  (defined) =>
    IdlTypeFlat.defined({
      name: defined.name,
      generics: defined.generics ?? [],
    }),
);

const objectCOptionJsonDecoder = jsonDecoderWrapped(
  idlTypeFlatParse,
  (content) =>
    IdlTypeFlat.defined({
      name: "$C", // TODO (repr) - should the option content be aligned to 4 ?
      generics: [IdlTypeFlat.option({ prefix: IdlTypePrefix.u32, content })],
    }),
);

function objectGenericJsonDecoder(value: JsonValue): IdlTypeFlat {
  const symbol = jsonCodecString.decoder(value);
  return IdlTypeFlat.generic({ symbol });
}

function objectOptionJsonDecoder(prefix: IdlTypePrefix) {
  return jsonDecoderWrapped(idlTypeFlatParse, (content) =>
    IdlTypeFlat.option({ prefix, content }),
  );
}

function objectVecJsonDecoder(prefix: IdlTypePrefix) {
  return jsonDecoderWrapped(idlTypeFlatParse, (items) =>
    IdlTypeFlat.vec({ prefix, items }),
  );
}

const objectLoopJsonDecoder = jsonDecoderWrapped(
  jsonDecoderObjectToObject({
    items: idlTypeFlatParse,
    stop: jsonDecoderByType<"end" | { value: JsonValue }>({
      string: jsonDecoderConst("end"),
      object: jsonDecoderObjectToObject({ value: jsonCodecValue.decoder }),
    }),
  }),
  (content) => IdlTypeFlat.loop(content),
);

function objectStructJsonDecoder(value: JsonValue): IdlTypeFlat {
  const fields = fieldsJsonDecoder(value);
  return IdlTypeFlat.struct({ fields });
}

function objectEnumJsonDecoder(prefix: IdlTypePrefix) {
  return jsonDecoderWrapped(variantsJsonDecoder, (variants) => {
    return IdlTypeFlat.enum({ prefix, variants });
  });
}

const objectPadInfoJsonDecoder = jsonDecoderObjectToObject({
  before: jsonDecoderNullable(jsonCodecNumber.decoder),
  end: jsonDecoderNullable(jsonCodecNumber.decoder),
});
function objectPadJsonDecoder(value: JsonValue): IdlTypeFlat {
  const info = objectPadInfoJsonDecoder(value);
  return IdlTypeFlat.pad({
    before: info.before ?? 0,
    end: info.end ?? 0,
    content: idlTypeFlatParseIsPossible(value)
      ? idlTypeFlatParse(value)
      : IdlTypeFlat.structNothing(),
  });
}

function objectBlobJsonDecoder(value: JsonValue): IdlTypeFlat {
  const bytes = idlUtilsBytesJsonDecoder(value);
  return IdlTypeFlat.blob({ bytes });
}

function objectConstJsonDecoder(value: JsonValue): IdlTypeFlat {
  const encoded = idlUtilsJsonRustedParse(jsonCodecString.decoder(value));
  const literal = jsonCodecNumber.decoder(encoded);
  return IdlTypeFlat.const({ literal });
}

const objectJsonDecoderCases = {
  type: idlTypeFlatParse,
  alias: idlTypeFlatParse,
  defined: objectDefinedJsonDecoder,
  generic: objectGenericJsonDecoder,
  coption: objectCOptionJsonDecoder,
  option: objectOptionJsonDecoder(IdlTypePrefix.u8),
  option8: objectOptionJsonDecoder(IdlTypePrefix.u8),
  option16: objectOptionJsonDecoder(IdlTypePrefix.u16),
  option32: objectOptionJsonDecoder(IdlTypePrefix.u32),
  option64: objectOptionJsonDecoder(IdlTypePrefix.u64),
  option128: objectOptionJsonDecoder(IdlTypePrefix.u128),
  vec: objectVecJsonDecoder(IdlTypePrefix.u32), // TODO (experiment) - support for svec and varint primitives ?
  vec8: objectVecJsonDecoder(IdlTypePrefix.u8),
  vec16: objectVecJsonDecoder(IdlTypePrefix.u16),
  vec32: objectVecJsonDecoder(IdlTypePrefix.u32),
  vec64: objectVecJsonDecoder(IdlTypePrefix.u64),
  vec128: objectVecJsonDecoder(IdlTypePrefix.u128),
  loop: objectLoopJsonDecoder,
  array: arrayJsonDecoder,
  fields: objectStructJsonDecoder, // TODO (experiment) - support for partial structs ?
  tuple: objectStructJsonDecoder,
  variants: objectEnumJsonDecoder(IdlTypePrefix.u8),
  variants8: objectEnumJsonDecoder(IdlTypePrefix.u8),
  variants16: objectEnumJsonDecoder(IdlTypePrefix.u16),
  variants32: objectEnumJsonDecoder(IdlTypePrefix.u32),
  variants64: objectEnumJsonDecoder(IdlTypePrefix.u64),
  variants128: objectEnumJsonDecoder(IdlTypePrefix.u128),
  padded: objectPadJsonDecoder,
  bytes: objectBlobJsonDecoder,
  value: objectConstJsonDecoder,
};
const objectJsonDecoderKeys = new Set(Object.keys(objectJsonDecoderCases));
const objectJsonDecoder: JsonDecoder<IdlTypeFlat> = jsonDecoderOneOfKeys(
  objectJsonDecoderCases,
);

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
  const primitive = idlTypePrimitiveByName.get(string);
  if (primitive !== undefined) {
    return IdlTypeFlat.primitive(primitive);
  }
  return IdlTypeFlat.defined({ name: string, generics: [] });
}

const valueJsonDecoder: JsonDecoder<IdlTypeFlat> = jsonDecoderByType({
  null: () => IdlTypeFlat.structNothing(),
  number: (number) => IdlTypeFlat.const({ literal: number }),
  string: stringJsonDecoder,
  array: arrayJsonDecoder,
  object: objectJsonDecoder,
});
