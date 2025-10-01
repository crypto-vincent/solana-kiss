import {
  JsonArray,
  jsonAsArray,
  jsonAsNumber,
  jsonAsObject,
  jsonAsString,
  jsonDecoderByType,
  jsonExpectArray,
  jsonExpectNumber,
  jsonExpectObject,
  jsonExpectString,
  JsonObject,
  JsonValue,
} from "../data/json";
import {
  IdlTypeFlat,
  IdlTypeFlatEnumVariant,
  IdlTypeFlatFieldNamed,
  IdlTypeFlatFields,
} from "./IdlTypeFlat";
import { IdlTypePrefix } from "./IdlTypePrefix";
import { IdlTypePrimitive } from "./IdlTypePrimitive";

export function idlTypeFlatParseObjectIsPossible(
  typeObject: JsonObject,
): boolean {
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

// TODO - implement all this

const valueDecoder = jsonDecoderByType({
  object: idlTypeFlatParseObject,
  string: idlTypeFlatParseString,
  array: idlTypeFlatParseArray,
  number: idlTypeFlatParseNumber,
});
export function idlTypeFlatParseValue(typeValue: JsonValue): IdlTypeFlat {
  return valueDecoder(typeValue);
}

export function idlTypeFlatParseArray(typeArray: JsonArray): IdlTypeFlat {
  if (typeArray.length === 1) {
    return IdlTypeFlat.vec({
      prefix: IdlTypePrefix.U32,
      items: idlTypeFlatParseValue(typeArray[0]!),
    });
  }
  if (typeArray.length === 2) {
    return IdlTypeFlat.array({
      items: idlTypeFlatParseValue(typeArray[0]!),
      length: idlTypeFlatParseValue(typeArray[1]!),
    });
  }
  throw new Error("Idl: Could not parse type array");
}

export function idlTypeFlatParseNumber(typeNumber: number): IdlTypeFlat {
  return IdlTypeFlat.const({ literal: typeNumber });
}

export function idlTypeFlatParseObject(typeObject: JsonObject): IdlTypeFlat {
  const typeValue = typeObject["type"];
  if (typeValue !== undefined) {
    return idlTypeFlatParseValue(typeValue);
  }
  const definedValue = typeObject["defined"];
  if (definedValue !== undefined) {
    return idlTypeFlatParseDefined(definedValue);
  }
  const genericValue = typeObject["generic"];
  if (genericValue !== undefined) {
    return idlTypeFlatParseGeneric(genericValue);
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
    return idlTypeFlatParseConst(constValue);
  }
  throw new Error("Could not parse type object");
}

export function idlTypeFlatParseOption(
  optionPrefix: IdlTypePrefix,
  optionContent: JsonValue,
): IdlTypeFlat {
  return IdlTypeFlat.option({
    prefix: optionPrefix,
    content: idlTypeFlatParseValue(optionContent),
  });
}

export function idlTypeFlatParseVec(
  vecPrefix: IdlTypePrefix,
  vecItems: JsonValue,
): IdlTypeFlat {
  return IdlTypeFlat.vec({
    prefix: vecPrefix,
    items: idlTypeFlatParseValue(vecItems),
  });
}

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

function idlTypeFlatParseStruct(structFields: JsonValue): IdlTypeFlat {
  return IdlTypeFlat.struct({ fields: idlTypeFlatParseFields(structFields) });
}

export function idlTypeFlatParseDefined(definedValue: JsonValue): IdlTypeFlat {
  const definedString = jsonAsString(definedValue);
  if (definedString !== undefined) {
    return IdlTypeFlat.defined({
      name: definedString,
      generics: [],
    });
  }
  const definedObject = jsonExpectObject(definedValue);
  const name = jsonExpectString(definedObject["name"]);
  const generics = [];
  const definedGenericsArray = jsonAsArray(definedObject["generics"]);
  if (definedGenericsArray !== undefined) {
    for (const definedGenericValue of definedGenericsArray) {
      generics.push(idlTypeFlatParseValue(definedGenericValue));
    }
  }
  return IdlTypeFlat.defined({ name, generics });
}

export function idlTypeFlatParseGeneric(genericValue: JsonValue): IdlTypeFlat {
  const symbol = jsonExpectString(genericValue);
  return IdlTypeFlat.generic({ symbol });
}

export function idlTypeFlatParseEnum(
  prefix: IdlTypePrefix,
  variantsValue: JsonValue,
): IdlTypeFlat {
  const variants = [];
  const variantsArray = jsonAsArray(variantsValue);
  if (variantsArray !== undefined) {
    for (
      let variantIndex = 0;
      variantIndex < variantsArray.length;
      variantIndex++
    ) {
      const variantValue = variantsArray[variantIndex];
      let variantCode = BigInt(variantIndex);
      let variantName = variantCode.toString();
      const variantNumber = jsonAsNumber(variantValue);
      if (variantNumber !== undefined) {
        variantCode = BigInt(variantNumber);
      }
      const variantString = jsonAsString(variantValue);
      if (variantString !== undefined) {
        variantName = variantString;
      }
      const variantObject = jsonAsObject(variantValue);
      if (variantObject !== undefined) {
        const variantCodeValue = variantObject["code"];
        const variantCodeNumber = jsonAsNumber(variantCodeValue);
        if (variantCodeNumber !== undefined) {
          variantCode = BigInt(variantCodeNumber);
        }
        const variantCodeString = jsonAsString(variantCodeValue);
        if (variantCodeString !== undefined) {
          variantCode = BigInt(variantCodeString);
        }
        const variantNameValue = variantObject["name"];
        if (variantNameValue !== undefined) {
          variantName = jsonExpectString(variantNameValue);
        }
      }
      variants.push(
        idlTypeFlatParseEnumVariant(variantName, variantCode, variantValue),
      );
    }
  }
  const variantsObject = jsonAsObject(variantsValue);
  if (variantsObject !== undefined) {
    Object.entries(variantsObject).forEach(([variantName, variantValue]) => {
      let variantCode = BigInt(0);
      const variantNumber = jsonAsNumber(variantValue);
      if (variantNumber !== undefined) {
        variantCode = BigInt(variantNumber);
      } else {
        const variantObject = jsonExpectObject(variantValue);
        const variantCodeValue = variantObject["code"];
        const variantCodeNumber = jsonAsNumber(variantCodeValue);
        if (variantCodeNumber !== undefined) {
          variantCode = BigInt(variantCodeNumber);
        }
        variantCode = BigInt(jsonExpectString(variantCodeValue));
      }
      variants.push(
        idlTypeFlatParseEnumVariant(variantName, variantCode, variantValue),
      );
    });
  }
  return IdlTypeFlat.enum({ prefix, variants });
}

export function idlTypeFlatParseEnumVariant(
  variantName: string,
  variantCode: bigint,
  variantValue: JsonValue,
): IdlTypeFlatEnumVariant {
  let docs = undefined;
  let fields = IdlTypeFlatFields.nothing();
  const variantObject = jsonAsObject(variantValue);
  if (variantObject !== undefined) {
    docs = variantObject["docs"];
    fields = idlTypeFlatParseFields(variantObject["fields"]);
  }
  return {
    name: variantName,
    code: variantCode,
    docs,
    fields,
  };
}

export function idlTypeFlatParsePadded(paddedValue: JsonValue): IdlTypeFlat {
  const paddedObject = jsonExpectObject(paddedValue);
  return IdlTypeFlat.padded({
    before: jsonExpectNumber(paddedObject["before"] ?? 0),
    minSize: jsonExpectNumber(paddedObject["min_size"] ?? 0),
    after: jsonExpectNumber(paddedObject["after"] ?? 0),
    content: idlTypeFlatParseObject(paddedObject),
  });
}

export function idlTypeFlatParseConst(constValue: JsonValue): IdlTypeFlat {
  return IdlTypeFlat.const({
    literal: Number(jsonExpectString(constValue)),
  });
}

export function idlTypeFlatParseFields(
  fieldsValue: JsonValue,
): IdlTypeFlatFields {
  if (fieldsValue === undefined || fieldsValue === null) {
    return IdlTypeFlatFields.nothing();
  }
  const fieldsArray = jsonExpectArray(fieldsValue);
  if (fieldsArray.length === 0) {
    return IdlTypeFlatFields.nothing();
  }
  let named = false;
  const fieldsInfos: Array<IdlTypeFlatFieldNamed> = [];
  for (let fieldIndex = 0; fieldIndex < fieldsArray.length; fieldIndex++) {
    const fieldValue = fieldsArray[fieldIndex];
    const fieldContent = idlTypeFlatParseValue(fieldValue);
    const fieldObject = jsonAsObject(fieldValue);
    if (fieldObject !== undefined) {
      const fieldName = jsonAsString(fieldObject["name"]);
      if (fieldName !== undefined) {
        named = true;
      }
      fieldsInfos.push({
        name: fieldName ?? fieldIndex.toString(),
        docs: fieldObject["docs"],
        content: fieldContent,
      });
    } else {
      fieldsInfos.push({
        name: fieldIndex.toString(),
        docs: undefined,
        content: fieldContent,
      });
    }
  }
  if (named) {
    return IdlTypeFlatFields.named(fieldsInfos);
  }
  return IdlTypeFlatFields.unnamed(
    fieldsInfos.map((fieldInfo) => {
      return {
        docs: fieldInfo.docs,
        content: fieldInfo.content,
      };
    }),
  );
}
