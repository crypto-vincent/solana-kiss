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
import { idlUtilsBytesJsonDecoder, idlUtilsJsonRustedParse } from "./IdlUtils";

/** Returns `true` if the JSON value can be parsed as a flat IDL type. */
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

/**
 * Parses a JSON value into an unresolved flat IDL type.
 * @param value - JSON type node.
 * @returns Parsed {@link IdlTypeFlat}.
 */
export function idlTypeFlatParse(value: JsonValue): IdlTypeFlat {
  return valueJsonDecoder(value);
}

/**
 * Parses a JSON value into unresolved flat IDL fields.
 * @param value - JSON fields node.
 * @returns Parsed {@link IdlTypeFlatFields}.
 */
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
      return IdlTypeFlat.vec({ prefix: undefined, items: array.items });
    }
    return IdlTypeFlat.array({ items: array.items, length: array.length });
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
  coptionWrapper,
);

function objectGenericJsonDecoder(value: JsonValue): IdlTypeFlat {
  const symbol = jsonCodecString.decoder(value);
  return IdlTypeFlat.generic({ symbol });
}

function objectOptionJsonDecoder(prefix: IdlTypePrefix | undefined) {
  return jsonDecoderWrapped(idlTypeFlatParse, (content) =>
    IdlTypeFlat.option({ prefix, content }),
  );
}

function objectVecJsonDecoder(prefix: IdlTypePrefix | undefined) {
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

function objectEnumJsonDecoder(prefix: IdlTypePrefix | undefined) {
  return jsonDecoderWrapped(variantsJsonDecoder, (variants) => {
    return IdlTypeFlat.enum({ prefix, variants });
  });
}

const objectPadInfoJsonDecoder = jsonDecoderObjectToObject({
  before: jsonDecoderNullable(jsonCodecNumber.decoder),
  minSize: jsonDecoderNullable(jsonCodecNumber.decoder),
});
function objectPadJsonDecoder(value: JsonValue): IdlTypeFlat {
  const info = objectPadInfoJsonDecoder(value);
  return IdlTypeFlat.padded({
    before: info.before ?? 0,
    minSize: info.minSize ?? 0,
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
  option: objectOptionJsonDecoder(undefined),
  option0: objectOptionJsonDecoder("u0"),
  option8: objectOptionJsonDecoder("u8"),
  option16: objectOptionJsonDecoder("u16"),
  option32: objectOptionJsonDecoder("u32"),
  option64: objectOptionJsonDecoder("u64"),
  option128: objectOptionJsonDecoder("u128"),
  vec: objectVecJsonDecoder(undefined), // TODO (experiment) - support for svec and varint primitives/prefixes ?
  vec0: objectVecJsonDecoder("u0"),
  vec8: objectVecJsonDecoder("u8"),
  vec16: objectVecJsonDecoder("u16"),
  vec32: objectVecJsonDecoder("u32"),
  vec64: objectVecJsonDecoder("u64"),
  vec128: objectVecJsonDecoder("u128"),
  // TODO (experiment) - support for backup decoding ?
  loop: objectLoopJsonDecoder,
  array: arrayJsonDecoder,
  fields: objectStructJsonDecoder, // TODO (experiment) - support for partial structs ?
  tuple: objectStructJsonDecoder,
  variants: objectEnumJsonDecoder(undefined),
  variants0: objectEnumJsonDecoder("u0"),
  variants8: objectEnumJsonDecoder("u8"),
  variants16: objectEnumJsonDecoder("u16"),
  variants32: objectEnumJsonDecoder("u32"),
  variants64: objectEnumJsonDecoder("u64"),
  variants128: objectEnumJsonDecoder("u128"),
  padded: objectPadJsonDecoder,
  bytes: objectBlobJsonDecoder,
  value: objectConstJsonDecoder,
};
const objectJsonDecoderKeys = new Set(Object.keys(objectJsonDecoderCases));
const objectJsonDecoder: JsonDecoder<IdlTypeFlat> = jsonDecoderOneOfKeys(
  objectJsonDecoderCases,
);

function presetBytes(prefix: IdlTypePrefix | undefined): IdlTypeFlat {
  const items = IdlTypeFlat.primitive("u8");
  return IdlTypeFlat.vec({ prefix, items });
}
const presetsByName = new Map<string, IdlTypeFlat>([
  ["u8", IdlTypeFlat.primitive("u8")],
  ["u16", IdlTypeFlat.primitive("u16")],
  ["u32", IdlTypeFlat.primitive("u32")],
  ["u64", IdlTypeFlat.primitive("u64")],
  ["u128", IdlTypeFlat.primitive("u128")],
  ["i8", IdlTypeFlat.primitive("i8")],
  ["i16", IdlTypeFlat.primitive("i16")],
  ["i32", IdlTypeFlat.primitive("i32")],
  ["i64", IdlTypeFlat.primitive("i64")],
  ["i128", IdlTypeFlat.primitive("i128")],
  ["f32", IdlTypeFlat.primitive("f32")],
  ["f64", IdlTypeFlat.primitive("f64")],
  ["bool", IdlTypeFlat.primitive("bool")],
  ["publicKey", IdlTypeFlat.primitive("pubkey")],
  ["PublicKey", IdlTypeFlat.primitive("pubkey")],
  ["pubkey", IdlTypeFlat.primitive("pubkey")],
  ["Pubkey", IdlTypeFlat.primitive("pubkey")],
  ["string", IdlTypeFlat.string({ prefix: undefined })],
  ["string0", IdlTypeFlat.string({ prefix: "u0" })],
  ["string8", IdlTypeFlat.string({ prefix: "u8" })],
  ["string16", IdlTypeFlat.string({ prefix: "u16" })],
  ["string32", IdlTypeFlat.string({ prefix: "u32" })],
  ["string64", IdlTypeFlat.string({ prefix: "u64" })],
  ["string128", IdlTypeFlat.string({ prefix: "u128" })],
  ["bytes", presetBytes(undefined)],
  ["bytes0", presetBytes("u0")],
  ["bytes8", presetBytes("u8")],
  ["bytes16", presetBytes("u16")],
  ["bytes32", presetBytes("u32")],
  ["bytes64", presetBytes("u64")],
  ["bytes128", presetBytes("u128")],
]);
function stringJsonDecoder(string: string): IdlTypeFlat {
  const preset = presetsByName.get(string);
  if (preset !== undefined) {
    return preset;
  }
  if (string.startsWith("COption<") && string.endsWith(">")) {
    const inner = stringJsonDecoder(string.slice("COption<".length, -1));
    return coptionWrapper(inner);
  }
  return IdlTypeFlat.defined({ name: string, generics: [] });
}

const valueJsonDecoder: JsonDecoder<IdlTypeFlat> = jsonDecoderByType({
  number: (number) => IdlTypeFlat.const({ literal: number }),
  string: stringJsonDecoder,
  array: arrayJsonDecoder,
  object: objectJsonDecoder,
});

function coptionWrapper(content: IdlTypeFlat): IdlTypeFlat {
  return IdlTypeFlat.defined({
    name: "$C", // TODO (repr) - should the option content be aligned to 4 ?
    generics: [IdlTypeFlat.option({ prefix: "u32", content })],
  });
}
