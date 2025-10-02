import { camelCaseToSnakeCase } from "../data/Casing";
import {
  JsonArray,
  jsonDecodeArray,
  jsonDecodeNumber,
  jsonDecoderArray,
  jsonDecoderByKind,
  jsonDecoderMap,
  jsonDecoderMerged,
  jsonDecoderObject,
  jsonDecoderObjectToMap,
  jsonDecoderOptional,
  jsonDecodeString,
  jsonDecodeValue,
  JsonObject,
  jsonPreview,
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

const valueDecoder = jsonDecoderByKind({
  number: (number: number) => IdlTypeFlat.const({ literal: number }),
  string: idlTypeFlatParseString,
  array: idlTypeFlatParseArray,
  object: idlTypeFlatParseObject,
});

export function idlTypeFlatParse(typeValue: JsonValue): IdlTypeFlat {
  return valueDecoder(typeValue);
}

// TODO - naming for this stuff should be JSON related ?
export function idlTypeFlatParseString(typeString: string): IdlTypeFlat {
  if (typeString === "bytes") {
    return IdlTypeFlat.vec({
      prefix: IdlTypePrefix.U32,
      items: IdlTypeFlat.primitive(IdlTypePrimitive.U8),
    });
  }
  if (typeString === "publicKey") {
    return IdlTypeFlat.primitive(IdlTypePrimitive.Pubkey);
  }
  if (typeString === "string") {
    return IdlTypeFlat.string({ prefix: IdlTypePrefix.U32 });
  }
  if (typeString === "string8") {
    return IdlTypeFlat.string({ prefix: IdlTypePrefix.U8 });
  }
  if (typeString === "string16") {
    return IdlTypeFlat.string({ prefix: IdlTypePrefix.U16 });
  }
  if (typeString === "string32") {
    return IdlTypeFlat.string({ prefix: IdlTypePrefix.U32 });
  }
  if (typeString === "string64") {
    return IdlTypeFlat.string({ prefix: IdlTypePrefix.U64 });
  }
  if (typeString === "string128") {
    return IdlTypeFlat.string({ prefix: IdlTypePrefix.U128 });
  }
  const primitive = IdlTypePrimitive.primitivesByName.get(typeString);
  return primitive
    ? IdlTypeFlat.primitive(primitive)
    : IdlTypeFlat.defined({
        name: typeString,
        generics: [],
      });
}

export function idlTypeFlatParseArray(typeArray: JsonArray): IdlTypeFlat {
  if (typeArray.length === 1) {
    return IdlTypeFlat.vec({
      prefix: IdlTypePrefix.U32,
      items: idlTypeFlatParse(typeArray[0]!),
    });
  }
  if (typeArray.length === 2) {
    return IdlTypeFlat.array({
      items: idlTypeFlatParse(typeArray[0]!),
      length: idlTypeFlatParse(typeArray[1]!),
    });
  }
  throw new Error(
    `Idl: Could not parse type array (found: ${jsonPreview(typeArray)})`,
  );
}

export function idlTypeFlatParseObject(typeObject: JsonObject): IdlTypeFlat {
  const typeValue = typeObject["type"];
  if (typeValue !== undefined) {
    return idlTypeFlatParse(typeValue);
  }
  const definedValue = typeObject["defined"];
  if (definedValue !== undefined) {
    return idlTypeFlatDefinedDecode(definedValue);
  }
  const genericValue = typeObject["generic"];
  if (genericValue !== undefined) {
    return idlTypeFlatGenericDecode(genericValue);
  }
  const optionValue = typeObject["option"];
  if (optionValue !== undefined) {
    return idlTypeFlatParseOption(IdlTypePrefix.U8, optionValue);
  }
  const option8Value = typeObject["option8"];
  if (option8Value !== undefined) {
    return idlTypeFlatParseOption(IdlTypePrefix.U8, option8Value);
  }
  const option16Value = typeObject["option16"];
  if (option16Value !== undefined) {
    return idlTypeFlatParseOption(IdlTypePrefix.U16, option16Value);
  }
  const option32Value = typeObject["option32"];
  if (option32Value !== undefined) {
    return idlTypeFlatParseOption(IdlTypePrefix.U32, option32Value);
  }
  const option64Value = typeObject["option64"];
  if (option64Value !== undefined) {
    return idlTypeFlatParseOption(IdlTypePrefix.U64, option64Value);
  }
  const option128Value = typeObject["option128"];
  if (option128Value !== undefined) {
    return idlTypeFlatParseOption(IdlTypePrefix.U128, option128Value);
  }
  const vecValue = typeObject["vec"];
  if (vecValue !== undefined) {
    return idlTypeFlatParseVec(IdlTypePrefix.U32, vecValue);
  }
  const vec8Value = typeObject["vec8"];
  if (vec8Value !== undefined) {
    return idlTypeFlatParseVec(IdlTypePrefix.U8, vec8Value);
  }
  const vec16Value = typeObject["vec16"];
  if (vec16Value !== undefined) {
    return idlTypeFlatParseVec(IdlTypePrefix.U16, vec16Value);
  }
  const vec32Value = typeObject["vec32"];
  if (vec32Value !== undefined) {
    return idlTypeFlatParseVec(IdlTypePrefix.U32, vec32Value);
  }
  const vec64Value = typeObject["vec64"];
  if (vec64Value !== undefined) {
    return idlTypeFlatParseVec(IdlTypePrefix.U64, vec64Value);
  }
  const vec128Value = typeObject["vec128"];
  if (vec128Value !== undefined) {
    return idlTypeFlatParseVec(IdlTypePrefix.U128, vec128Value);
  }
  const arrayValue = typeObject["array"];
  if (arrayValue !== undefined) {
    return idlTypeFlatParseArray(jsonExpectArray(arrayValue));
  }
  const fieldsValue = typeObject["fields"];
  if (fieldsValue !== undefined) {
    return idlTypeFlatParseStruct(fieldsValue);
  }
  const variantsValue = typeObject["variants"];
  if (variantsValue !== undefined) {
    return idlTypeFlatParseEnum(IdlTypePrefix.U8, variantsValue);
  }
  const variants8Value = typeObject["variants8"];
  if (variants8Value !== undefined) {
    return idlTypeFlatParseEnum(IdlTypePrefix.U8, variants8Value);
  }
  const variants16Value = typeObject["variants16"];
  if (variants16Value !== undefined) {
    return idlTypeFlatParseEnum(IdlTypePrefix.U16, variants16Value);
  }
  const variants32Value = typeObject["variants32"];
  if (variants32Value !== undefined) {
    return idlTypeFlatParseEnum(IdlTypePrefix.U32, variants32Value);
  }
  const variants64Value = typeObject["variants64"];
  if (variants64Value !== undefined) {
    return idlTypeFlatParseEnum(IdlTypePrefix.U64, variants64Value);
  }
  const variants128Value = typeObject["variants128"];
  if (variants128Value !== undefined) {
    return idlTypeFlatParseEnum(IdlTypePrefix.U128, variants128Value);
  }
  const paddedValue = typeObject["padded"];
  if (paddedValue !== undefined) {
    return idlTypeFlatParsePadded(paddedValue);
  }
  const constValue = typeObject["value"];
  if (constValue !== undefined) {
    return idlTypeFlatConstDecode(constValue);
  }
  throw new Error("Could not parse type object");
}

export function idlTypeFlatGenericDecode(genericValue: JsonValue): IdlTypeFlat {
  const symbol = jsonExpectString(genericValue);
  return IdlTypeFlat.generic({ symbol });
}

export function idlTypeFlatParseOption(
  optionPrefix: IdlTypePrefix,
  optionContent: JsonValue,
): IdlTypeFlat {
  return IdlTypeFlat.option({
    prefix: optionPrefix,
    content: idlTypeFlatParse(optionContent),
  });
}

export function idlTypeFlatParseVec(
  vecPrefix: IdlTypePrefix,
  vecItems: JsonValue,
): IdlTypeFlat {
  return IdlTypeFlat.vec({
    prefix: vecPrefix,
    items: idlTypeFlatParse(vecItems),
  });
}

export function idlTypeFlatParseStruct(structFields: JsonValue): IdlTypeFlat {
  return IdlTypeFlat.struct({ fields: idlTypeFlatFieldsParse(structFields) });
}

const bigintDecode = jsonDecoderByKind({
  number: (number: number) => BigInt(number),
  string: (string: string) => BigInt(string), // TODO - make this reusable
});

const idlTypeFlatEnumArrayVariantDecode = jsonDecoderByKind<{
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
    fields: idlTypeFlatFieldsDecode,
  }),
});

const idlTypeFlatEnumObjectVariantDecode = jsonDecoderByKind<{
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
    fields: idlTypeFlatFieldsDecode,
  }),
});

const idlTypeFlatEnumDecode = jsonDecoderByKind({
  array: jsonDecoderMap(
    jsonDecoderArray(idlTypeFlatEnumArrayVariantDecode),
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
    jsonDecoderObjectToMap(idlTypeFlatEnumObjectVariantDecode),
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

export function idlTypeFlatParsePadded(paddedValue: JsonValue): IdlTypeFlat {
  // TODO - could we use jsonType in those cases?
  const paddedObject = jsonExpectObject(paddedValue);
  return IdlTypeFlat.padded({
    before: jsonExpectNumber(paddedObject["before"] ?? 0),
    minSize: jsonExpectNumber(paddedObject["min_size"] ?? 0),
    after: jsonExpectNumber(paddedObject["after"] ?? 0),
    content: idlTypeFlatParseObject(paddedObject),
  });
}
export const idlTypeFlatPaddedDecode = jsonDecoderObject(
  {
    before: jsonDecodeNumber,
    minSize: jsonDecodeNumber,
    after: jsonDecodeNumber,
    // content: idlTypeFlatParseObject, // TODO - type json
  },
  {
    minSize: "min_size",
  },
);

export const idlTypeFlatGenericDecode = jsonDecoderMap(
  jsonDecodeString,
  (string: string) =>
    IdlTypeFlat.generic({
      symbol: string,
    }),
);

export const idlTypeFlatConstDecode = jsonDecoderMap(
  jsonDecodeString,
  (string: string) =>
    IdlTypeFlat.const({
      literal: Number(string),
    }),
);

export const idlTypeFlatDefinedDecode = jsonDecoderMap(
  jsonDecoderByKind({
    string: (string: string) => ({
      name: string,
      generics: [],
    }),
    object: jsonDecoderObject({
      name: jsonDecodeString,
      generics: jsonDecodeArray, // TODO - generics
      // generics: jsonDecoderOptional(jsonDecoderArray(jsonDecodeValue)),
    }),
  }),
  (defined) =>
    IdlTypeFlat.defined({
      name: defined.name,
      generics: [],
      //generics: defined.generics,
    }),
);

const idlTypeFlatFieldsFieldDecode = jsonDecoderMerged(
  jsonDecoderByKind({
    string: () => ({ name: undefined, docs: undefined }),
    object: jsonDecoderObject({
      name: jsonDecoderOptional(jsonDecodeString),
      docs: jsonDecodeValue,
    }),
  }),
  jsonDecodeValue, // TODO - use json decoder
  (fieldMeta, fieldType) => ({
    name: fieldMeta.name,
    docs: fieldMeta.docs,
    content: idlTypeFlatParse(fieldType),
  }),
);
export const idlTypeFlatFieldsDecode = jsonDecoderByKind({
  undefined: () => IdlTypeFlatFields.nothing(),
  array: (array: JsonArray) => {
    if (array.length === 0) {
      return IdlTypeFlatFields.nothing();
    }
    let named = false;
    const fields = array.map((fieldValue, fieldIndex) => {
      const field = idlTypeFlatFieldsFieldDecode(fieldValue);
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

export function idlTypeFlatFieldsParse(
  fieldsValue: JsonValue,
): IdlTypeFlatFields {
  return idlTypeFlatFieldsDecode(fieldsValue);
}
