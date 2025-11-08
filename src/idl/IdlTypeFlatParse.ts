import { casingConvertToSnake } from "../data/Casing";
import {
  JsonDecoder,
  JsonValue,
  jsonAsArray,
  jsonAsNumber,
  jsonAsObject,
  jsonAsString,
  jsonCodecInteger,
  jsonCodecNumber,
  jsonCodecRaw,
  jsonCodecString,
  jsonDecoderArray,
  jsonDecoderArrayToObject,
  jsonDecoderByKind,
  jsonDecoderConst,
  jsonDecoderForked,
  jsonDecoderObject,
  jsonDecoderObjectKeysToValue,
  jsonDecoderObjectToMap,
  jsonDecoderOptional,
  jsonDecoderTransform,
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

export function idlTypeFlatParseIsPossible(value: JsonValue): boolean {
  if (value === null) {
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
    object.hasOwnProperty("alias") ||
    object.hasOwnProperty("defined") ||
    object.hasOwnProperty("generic") ||
    object.hasOwnProperty("coption") ||
    object.hasOwnProperty("option") ||
    object.hasOwnProperty("option8") ||
    object.hasOwnProperty("option16") ||
    object.hasOwnProperty("option32") ||
    object.hasOwnProperty("option64") ||
    object.hasOwnProperty("option128") ||
    object.hasOwnProperty("vec") || // TODO (experiment) - support for svec and varint primitives ?
    object.hasOwnProperty("vec8") ||
    object.hasOwnProperty("vec16") ||
    object.hasOwnProperty("vec32") ||
    object.hasOwnProperty("vec64") ||
    object.hasOwnProperty("vec128") ||
    object.hasOwnProperty("loop") ||
    object.hasOwnProperty("array") ||
    object.hasOwnProperty("fields") || // TODO (experiment) - support for partial structs ?
    object.hasOwnProperty("variants") ||
    object.hasOwnProperty("variants8") ||
    object.hasOwnProperty("variants16") ||
    object.hasOwnProperty("variants32") ||
    object.hasOwnProperty("variants64") ||
    object.hasOwnProperty("variants128") ||
    object.hasOwnProperty("padded") ||
    object.hasOwnProperty("bytes") ||
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

const arrayJsonDecoder = jsonDecoderTransform(
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

const fieldsItemJsonDecoder = jsonDecoderForked([
  jsonDecoderByKind({
    null: () => ({ name: undefined, docs: undefined }),
    string: () => ({ name: undefined, docs: undefined }),
    array: () => ({ name: undefined, docs: undefined }),
    object: jsonDecoderObject({
      name: jsonDecoderOptional(jsonCodecString.decoder),
      docs: idlDocsParse,
    }),
  }),
  idlTypeFlatParse,
]);
const fieldsJsonDecoder = jsonDecoderByKind({
  undefined: () => IdlTypeFlatFields.nothing(),
  null: () => IdlTypeFlatFields.nothing(),
  array: jsonDecoderTransform(
    jsonDecoderArray(fieldsItemJsonDecoder),
    (fieldsItems) => {
      if (fieldsItems.length === 0) {
        return IdlTypeFlatFields.nothing();
      }
      let named = false;
      const fields = fieldsItems.map((fieldItem, fieldIndex) => {
        const fieldMeta = fieldItem[0];
        const fieldType = fieldItem[1];
        if (fieldMeta.name !== undefined) {
          named = true;
        }
        return {
          name: casingConvertToSnake(fieldMeta.name ?? fieldIndex.toString()),
          docs: fieldMeta.docs,
          content: fieldType,
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
  docs: IdlDocs;
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
    name: jsonDecoderOptional(jsonCodecString.decoder),
    code: jsonDecoderOptional(jsonCodecInteger.decoder),
    docs: idlDocsParse,
    fields: fieldsJsonDecoder,
  }),
});
const variantsObjectValueJsonDecoder = jsonDecoderByKind<{
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
  object: jsonDecoderObject({
    code: jsonCodecInteger.decoder,
    docs: idlDocsParse,
    fields: fieldsJsonDecoder,
  }),
});
const variantsJsonDecoder = jsonDecoderByKind({
  array: jsonDecoderTransform(
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
  object: jsonDecoderTransform(
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

const objectDefinedJsonDecoder = jsonDecoderTransform(
  jsonDecoderByKind({
    string: (string) => ({ name: string, generics: undefined }),
    object: jsonDecoderObject({
      name: jsonCodecString.decoder,
      generics: jsonDecoderOptional(jsonDecoderArray(idlTypeFlatParse)),
    }),
  }),
  (defined) =>
    IdlTypeFlat.defined({
      name: defined.name,
      generics: defined.generics ?? [],
    }),
);

const objectCOptionJsonDecoder = jsonDecoderTransform(
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
  return jsonDecoderTransform(idlTypeFlatParse, (content) =>
    IdlTypeFlat.option({ prefix, content }),
  );
}

function objectVecJsonDecoder(prefix: IdlTypePrefix) {
  return jsonDecoderTransform(idlTypeFlatParse, (items) =>
    IdlTypeFlat.vec({ prefix, items }),
  );
}

// TODO (naming) - nit, more intuitive IDL format like "eof" or "rest"
const objectLoopJsonDecoder = jsonDecoderTransform(
  jsonDecoderObject({
    items: idlTypeFlatParse,
    stop: jsonDecoderByKind<"end" | { value: JsonValue }>({
      string: jsonDecoderConst("end"),
      object: jsonDecoderObject({ value: jsonCodecRaw.decoder }),
    }),
  }),
  (content) => IdlTypeFlat.loop(content),
);

function objectStructJsonDecoder(value: JsonValue): IdlTypeFlat {
  const fields = fieldsJsonDecoder(value);
  return IdlTypeFlat.struct({ fields });
}

function objectEnumJsonDecoder(prefix: IdlTypePrefix) {
  return jsonDecoderTransform(variantsJsonDecoder, (variantsRaw) => {
    const variantsSorted = variantsRaw.sort((a, b) => {
      if (a.code < b.code) {
        return -1;
      }
      if (a.code > b.code) {
        return 1;
      }
      return 0;
    });
    let mask = 0n;
    for (const variant of variantsSorted) {
      mask |= variant.code;
    }
    const indexByName = new Map<string, number>();
    const indexByCodeBigInt = new Map<bigint, number>();
    const indexByCodeString = new Map<string, number>();
    for (
      let variantSortedIndex = 0;
      variantSortedIndex < variantsSorted.length;
      variantSortedIndex++
    ) {
      const variant = variantsSorted[variantSortedIndex]!;
      if (indexByName.has(variant.name)) {
        throw new Error(`Duplicate enum variant name: ${variant.name}`);
      }
      if (indexByCodeBigInt.has(variant.code)) {
        throw new Error(`Duplicate enum variant code: ${variant.code}`);
      }
      if (indexByCodeString.has(variant.code.toString())) {
        throw new Error(`Duplicate enum variant code: ${variant.code}`);
      }
      indexByName.set(variant.name, variantSortedIndex);
      indexByCodeBigInt.set(variant.code, variantSortedIndex);
      indexByCodeString.set(variant.code.toString(), variantSortedIndex);
    }
    return IdlTypeFlat.enum({
      prefix,
      mask,
      indexByName,
      indexByCodeBigInt,
      indexByCodeString,
      variants: variantsSorted,
    });
  });
}

const objectPadInfoJsonDecoder = jsonDecoderObject({
  before: jsonDecoderOptional(jsonCodecNumber.decoder),
  end: jsonDecoderOptional(jsonCodecNumber.decoder),
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

const objectJsonDecoder: JsonDecoder<IdlTypeFlat> =
  jsonDecoderObjectKeysToValue({
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
    vec: objectVecJsonDecoder(IdlTypePrefix.u32),
    vec8: objectVecJsonDecoder(IdlTypePrefix.u8),
    vec16: objectVecJsonDecoder(IdlTypePrefix.u16),
    vec32: objectVecJsonDecoder(IdlTypePrefix.u32),
    vec64: objectVecJsonDecoder(IdlTypePrefix.u64),
    vec128: objectVecJsonDecoder(IdlTypePrefix.u128),
    loop: objectLoopJsonDecoder,
    array: arrayJsonDecoder,
    fields: objectStructJsonDecoder,
    variants: objectEnumJsonDecoder(IdlTypePrefix.u8),
    variants8: objectEnumJsonDecoder(IdlTypePrefix.u8),
    variants16: objectEnumJsonDecoder(IdlTypePrefix.u16),
    variants32: objectEnumJsonDecoder(IdlTypePrefix.u32),
    variants64: objectEnumJsonDecoder(IdlTypePrefix.u64),
    variants128: objectEnumJsonDecoder(IdlTypePrefix.u128),
    padded: objectPadJsonDecoder,
    bytes: objectBlobJsonDecoder,
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
  const primitive = idlTypePrimitiveByName.get(string);
  if (primitive !== undefined) {
    return IdlTypeFlat.primitive(primitive);
  }
  return IdlTypeFlat.defined({ name: string, generics: [] });
}

const valueJsonDecoder: JsonDecoder<IdlTypeFlat> = jsonDecoderByKind({
  null: () => IdlTypeFlat.structNothing(),
  number: (number) => IdlTypeFlat.const({ literal: number }),
  string: stringJsonDecoder,
  array: arrayJsonDecoder,
  object: objectJsonDecoder,
});
