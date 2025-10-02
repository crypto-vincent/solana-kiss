import { Immutable, withContext } from "./Utils";

export type JsonValue =
  | undefined
  | null
  | boolean
  | number
  | string
  | JsonArray
  | JsonObject;
export type JsonArray = Array<JsonValue>;
export interface JsonObject {
  [key: string]: JsonValue;
}

export function jsonPreview(value: JsonValue): string {
  if (value === undefined) {
    return "Undefined";
  }
  if (value === null) {
    return "Null";
  }
  const boolean = jsonAsBoolean(value);
  if (boolean !== undefined) {
    return `Boolean: ${boolean}`;
  }
  const number = jsonAsNumber(value);
  if (number !== undefined) {
    return `Number: ${number}`;
  }
  const string = jsonAsString(value);
  if (string !== undefined) {
    return `String: "${string}"`;
  }
  const maxColumns = 40;
  const array = jsonAsArray(value);
  if (array !== undefined) {
    let previews = array.map(jsonPreview).join(", ");
    if (previews.length > maxColumns) {
      previews = previews.slice(0, maxColumns - 3) + "...";
    }
    return `Array(x${array.length}): [${previews}]`;
  }
  const object = jsonAsObject(value);
  if (object !== undefined) {
    const entries = Object.entries(object);
    let previews = entries
      .map(([key, val]) => `${key}: ${jsonPreview(val)}`)
      .join(", ");
    if (previews.length > maxColumns) {
      previews = previews.slice(0, maxColumns - 3) + "...";
    }
    return `Object(x${entries.length}): {${previews}}`;
  }
  throw new Error(`JSON: Unknown value: ${value?.toString()}`);
}

export function jsonAsBoolean(value: JsonValue): boolean | undefined {
  if (typeof value === "boolean" || value instanceof Boolean) {
    return value as boolean;
  }
  return undefined;
}
export function jsonAsNumber(value: JsonValue): number | undefined {
  if (typeof value === "number" || value instanceof Number) {
    return value as number;
  }
  return undefined;
}
export function jsonAsString(value: JsonValue): string | undefined {
  if (typeof value === "string" || value instanceof String) {
    return value as string;
  }
  return undefined;
}
export function jsonAsArray(value: JsonValue): JsonArray | undefined {
  if (Array.isArray(value)) {
    return value as JsonArray;
  }
  return undefined;
}
export function jsonAsObject(value: JsonValue): JsonObject | undefined {
  if (typeof value === "object" && !Array.isArray(value) && value !== null) {
    return value as JsonObject;
  }
  return undefined;
}

export function jsonIsDeepEqual(
  foundValue: JsonValue,
  expectedValue: JsonValue,
) {
  if (expectedValue === foundValue) {
    return true;
  }
  const expectedArray = jsonAsArray(expectedValue);
  if (expectedArray !== undefined) {
    const foundArray = jsonAsArray(foundValue);
    if (
      foundArray === undefined ||
      foundArray.length !== expectedArray.length
    ) {
      return false;
    }
    for (let index = 0; index < foundArray.length; index++) {
      if (!jsonIsDeepEqual(foundArray[index], expectedArray[index])) {
        return false;
      }
    }
    return true;
  }
  const expectedObject = jsonAsObject(expectedValue);
  if (expectedObject !== undefined) {
    const foundObject = jsonAsObject(foundValue);
    if (foundObject === undefined) {
      return false;
    }
    const expectedKeys = new Set<string>();
    for (const expectedKey in expectedObject) {
      expectedKeys.add(expectedKey);
    }
    for (const foundKey in foundObject) {
      if (!jsonIsDeepEqual(foundObject[foundKey], expectedObject[foundKey])) {
        return false;
      }
      expectedKeys.delete(foundKey);
    }
    return expectedKeys.size === 0;
  }
  return false;
}

export function jsonIsSubset(subsetValue: JsonValue, supersetValue: JsonValue) {
  if (subsetValue === undefined) {
    return true;
  }
  if (subsetValue === supersetValue) {
    return true;
  }
  const subsetArray = jsonAsArray(subsetValue);
  if (subsetArray !== undefined) {
    const supersetArray = jsonAsArray(supersetValue);
    if (
      supersetArray === undefined ||
      subsetArray.length > supersetArray.length
    ) {
      return false;
    }
    for (let index = 0; index < subsetArray.length; index++) {
      if (!jsonIsSubset(subsetArray[index]!, supersetArray[index]!)) {
        return false;
      }
    }
    return true;
  }
  const subsetObject = jsonAsObject(subsetValue);
  if (subsetObject !== undefined) {
    const supersetObject = jsonAsObject(supersetValue);
    if (supersetObject === undefined) {
      return false;
    }
    for (const key of Object.keys(subsetObject)) {
      if (!jsonIsSubset(subsetObject[key]!, supersetObject[key])) {
        return false;
      }
    }
    return true;
  }
  return false;
}

export function jsonExpectArray(value: JsonValue): JsonArray {
  const result = jsonAsArray(value);
  if (result === undefined) {
    throw new Error(`JSON: Expected an array (found: ${jsonPreview(value)})`);
  }
  return result;
}
// TODO - all of this could be inserted in a nice decoder system and never be manually used?
export function jsonExpectObject(value: JsonValue): JsonObject {
  const result = jsonAsObject(value);
  if (result === undefined) {
    throw new Error(`JSON: Expected an object (found: ${jsonPreview(value)})`);
  }
  return result;
}

export type JsonDecoderContent<S> = S extends JsonDecoder<infer T> ? T : never;
export type JsonDecoder<Content> = { decode: (encoded: JsonValue) => Content };

export type JsonEncoderContent<S> = S extends JsonEncoder<infer T> ? T : never;
export type JsonEncoder<Content> = {
  encode: (decoded: Immutable<Content>) => JsonValue;
};

export type JsonTypeContent<S> = S extends JsonType<infer T> ? T : never;
export type JsonType<Content> = JsonDecoder<Content> & JsonEncoder<Content>;

export function jsonType<Content>(
  decoder: JsonDecoder<Content>,
  encoder: JsonEncoder<Content>,
): JsonType<Content> {
  return { ...decoder, ...encoder };
}

export type JsonPrimitive = undefined | null | boolean | number | string;
export function jsonDecoderConst<Const extends JsonPrimitive>(
  expected: Const,
): JsonDecoder<Const> {
  return {
    decode(encoded: JsonValue): Const {
      if (encoded !== expected) {
        throw new Error(
          `JSON: Expected const: ${expected} (found: ${jsonPreview(encoded)})`,
        );
      }
      return expected;
    },
  };
}
export function jsonEncoderConst<Const extends JsonPrimitive>(
  expected: Const,
): JsonEncoder<Const> {
  return {
    encode(_: Immutable<JsonValue>): Const {
      return expected;
    },
  };
}
export function jsonTypeConst<Const extends JsonPrimitive>(
  expected: Const,
): JsonType<Const> {
  return jsonType(jsonDecoderConst(expected), jsonEncoderConst(expected));
}

export const jsonDecoderValue: JsonDecoder<JsonValue> = {
  decode(encoded: JsonValue): JsonValue {
    if (encoded === undefined) {
      return undefined;
    }
    return JSON.parse(JSON.stringify(encoded));
  },
};
export const jsonEncoderValue: JsonEncoder<JsonValue> = {
  encode(decoded: Immutable<JsonValue>): JsonValue {
    if (decoded === undefined) {
      return undefined;
    }
    return JSON.parse(JSON.stringify(decoded));
  },
};
export const jsonTypeValue: JsonType<JsonValue> = jsonType(
  jsonDecoderValue,
  jsonEncoderValue,
);

export const jsonDecoderBoolean: JsonDecoder<boolean> = {
  decode(encoded: JsonValue): boolean {
    const decoded = jsonAsBoolean(encoded);
    if (decoded === undefined) {
      throw new Error(
        `JSON: Expected a boolean (found: ${jsonPreview(encoded)})`,
      );
    }
    return decoded;
  },
};
export const jsonEncoderBoolean: JsonEncoder<boolean> = {
  encode(decoded: Immutable<boolean>): JsonValue {
    return decoded;
  },
};
export const jsonTypeBoolean: JsonType<boolean> = jsonType(
  jsonDecoderBoolean,
  jsonEncoderBoolean,
);

export const jsonDecoderNumber: JsonDecoder<number> = {
  decode(encoded: JsonValue): number {
    const decoded = jsonAsNumber(encoded);
    if (decoded === undefined) {
      throw new Error(
        `JSON: Expected a number (found: ${jsonPreview(encoded)})`,
      );
    }
    return decoded;
  },
};
export const jsonEncoderNumber: JsonEncoder<number> = {
  encode(decoded: Immutable<number>): JsonValue {
    return decoded;
  },
};
export const jsonTypeNumber: JsonType<number> = jsonType(
  jsonDecoderNumber,
  jsonEncoderNumber,
);

export const jsonDecoderString: JsonDecoder<string> = {
  decode(encoded: JsonValue): string {
    const decoded = jsonAsString(encoded);
    if (decoded === undefined) {
      throw new Error(
        `JSON: Expected a string (found: ${jsonPreview(encoded)})`,
      );
    }
    return decoded;
  },
};
export const jsonEncoderString: JsonEncoder<string> = {
  encode(decoded: Immutable<string>): JsonValue {
    return decoded;
  },
};
export const jsonTypeString: JsonType<string> = jsonType(
  jsonDecoderString,
  jsonEncoderString,
);

export function jsonDecoderMapped<Mapped, Unmapped>(
  unmappedDecoder: JsonDecoder<Unmapped>,
  map: (unmapped: Unmapped) => Mapped,
): JsonDecoder<Mapped> {
  return {
    decode(encoded: JsonValue): Mapped {
      return map(unmappedDecoder.decode(encoded));
    },
  };
}
export function jsonEncoderMapped<Mapped, Unmapped>(
  unmappedEncoder: JsonEncoder<Unmapped>,
  unmap: (mapped: Immutable<Mapped>) => Immutable<Unmapped>,
): JsonEncoder<Mapped> {
  return {
    encode(decoded: Immutable<Mapped>): JsonValue {
      return unmappedEncoder.encode(unmap(decoded));
    },
  };
}
export function jsonTypeMapped<Mapped, Unmapped>(
  unmappedType: JsonType<Unmapped>,
  map: (unmapped: Unmapped) => Mapped,
  unmap: (mapped: Immutable<Mapped>) => Immutable<Unmapped>,
): JsonType<Mapped> {
  return jsonType(
    jsonDecoderMapped(unmappedType, map),
    jsonEncoderMapped(unmappedType, unmap),
  );
}

/*
export const jsonDecoderStringToBigInt: JsonDecoder<bigint> = { encode(
  encoded: JsonValue,
): bigint {
  return BigInt(jsonDecoderString.decode(encoded));
};
export const jsonEncoderStringToBigInt: JsonEncoder<bigint> = (
  decoded: Immutable<bigint>,
): JsonValue => {
  return String(decoded);
};
export const jsonTypeStringToBigInt: JsonType<bigint> = {
  decode: jsonDecoderStringToBigInt,
  encode: jsonEncoderStringToBigInt,
};
*/

export function jsonDecoderArray<Item>(
  itemDecoder: JsonDecoder<Item>,
): JsonDecoder<Array<Item>> {
  return {
    decode(encoded: JsonValue): Array<Item> {
      const array = jsonAsArray(encoded);
      if (array === undefined) {
        throw new Error(
          `JSON: Expected an array (found: ${jsonPreview(encoded)})`,
        );
      }
      return array.map((item, index) =>
        withContext(`JSON: Decode Array[${index}] =>`, () =>
          itemDecoder.decode(item),
        ),
      );
    },
  };
}
export function jsonEncoderArray<Item>(
  itemEncoder: JsonEncoder<Item>,
): JsonEncoder<Array<Item>> {
  return {
    encode(decoded: Immutable<Array<Item>>): JsonValue {
      return decoded.map((item) => itemEncoder.encode(item));
    },
  };
}
export function jsonTypeArray<Item>(
  itemType: JsonType<Item>,
): JsonType<Array<Item>> {
  return jsonType(jsonDecoderArray(itemType), jsonEncoderArray(itemType));
}

export function jsonDecoderArrayToTuple<
  Items extends [JsonDecoder<any>, ...Array<JsonDecoder<any>>],
>(
  itemsDecoders: Items,
): JsonDecoder<{ [K in keyof Items]: JsonDecoderContent<Items[K]> }> {
  return {
    decode(encoded: JsonValue): {
      [K in keyof Items]: JsonDecoderContent<Items[K]>;
    } {
      const array = jsonExpectArray(encoded);
      const decoded = {} as {
        [K in keyof Items]: JsonDecoderContent<Items[K]>;
      };
      for (let index = 0; index < itemsDecoders.length; index++) {
        decoded[index as keyof typeof decoded] = withContext(
          `JSON: Decode Array[${index}] =>`,
          () => itemsDecoders[index]!.decode(array[index]),
        );
      }
      return decoded;
    },
  };
}
export function jsonEncoderArrayToTuple<
  Items extends [JsonEncoder<any>, ...Array<JsonEncoder<any>>],
>(
  itemsEncoders: Items,
): JsonEncoder<{ [K in keyof Items]: JsonEncoderContent<Items[K]> }> {
  return {
    encode(
      decoded: Immutable<{ [K in keyof Items]: JsonEncoderContent<Items[K]> }>,
    ): JsonValue {
      const array = new Array<JsonValue>();
      for (let index = 0; index < itemsEncoders.length; index++) {
        array.push(
          itemsEncoders[index]!.encode(decoded[index as keyof typeof decoded]),
        );
      }
      return array;
    },
  };
}
export function jsonTypeArrayToTuple<
  Items extends [JsonType<any>, ...Array<JsonType<any>>],
>(
  itemsTypes: Items,
): JsonType<{ [K in keyof Items]: JsonTypeContent<Items[K]> }> {
  return jsonType(jsonDecoderArrayToTuple(itemsTypes), jsonEncoderArrayToTuple(itemsTypes));
  return {
    ...,
    ...,
  } as JsonType<{ [K in keyof Items]: JsonTypeContent<Items[K]> }>;
}

export function jsonDecoderArrayToObject<
  Shape extends { [key: string]: JsonDecoder<any> },
>(
  shape: Shape,
): JsonDecoder<{ [K in keyof Shape]: JsonDecoderContent<Shape[K]> }> {
  return {
    decode(encoded: JsonValue): {
      [K in keyof Shape]: JsonDecoderContent<Shape[K]>;
    } {
      const array = jsonExpectArray(encoded);
      const decoded = {} as {
        [K in keyof Shape]: JsonDecoderContent<Shape[K]>;
      };
      let index = 0;
      for (const key in shape) {
        decoded[key] = withContext(`JSON: Decode Array[${index}] =>`, () =>
          shape[key]!.decode(array[index++]),
        );
      }
      return decoded;
    },
  };
}
export function jsonEncoderArrayToObject<
  Shape extends { [key: string]: JsonEncoder<any> },
>(
  shape: Shape,
): JsonEncoder<{ [K in keyof Shape]: JsonEncoderContent<Shape[K]> }> {
  return {
    encode(
      decoded: Immutable<{ [K in keyof Shape]: JsonEncoderContent<Shape[K]> }>,
    ): JsonValue {
      const encoded = new Array<JsonValue>();
      let index = 0;
      for (const key in shape) {
        encoded[index++] = shape[key]!.encode(
          decoded[key as keyof typeof decoded],
        );
      }
      return encoded;
    },
  };
}
export function jsonTypeArrayToObject<
  Shape extends { [key: string]: JsonType<any> },
>(shape: Shape): JsonType<{ [K in keyof Shape]: JsonTypeContent<Shape[K]> }> {
  return {
    ...jsonDecoderArrayToObject(shape),
    ...jsonEncoderArrayToObject(shape),
  } as JsonType<{ [K in keyof Shape]: JsonTypeContent<Shape[K]> }>;
}

export function jsonDecoderObject<
  Shape extends { [key: string]: JsonDecoder<any> },
>(
  shape: Shape,
  keysEncoding?: { [K in keyof Shape]?: string },
): JsonDecoder<{ [K in keyof Shape]: JsonDecoderContent<Shape[K]> }> {
  return {
    decode(encoded: JsonValue): {
      [K in keyof Shape]: JsonDecoderContent<Shape[K]>;
    } {
      const object = jsonExpectObject(encoded);
      const decoded = {} as {
        [K in keyof Shape]: JsonDecoderContent<Shape[K]>;
      };
      for (const keyDecoded in shape) {
        const keyEncoded = keysEncoding?.[keyDecoded] ?? keyDecoded;
        decoded[keyDecoded] = withContext(
          `JSON: Decode Object["${keyEncoded}"] =>`,
          () => shape[keyDecoded]!.decode(object[keyEncoded]),
        );
      }
      return decoded;
    },
  };
}
export function jsonEncoderObject<
  Shape extends { [key: string]: JsonEncoder<any> },
>(
  shape: Shape,
  keysEncoding?: { [K in keyof Shape]?: string },
): JsonEncoder<{ [K in keyof Shape]: JsonEncoderContent<Shape[K]> }> {
  return {
    encode(
      decoded: Immutable<{
        [K in keyof Shape]: JsonEncoderContent<Shape[K]>;
      }>,
    ): JsonValue {
      const encoded = {} as JsonObject;
      for (const keyDecoded in shape) {
        const keyEncoded = keysEncoding?.[keyDecoded] ?? keyDecoded;
        encoded[keyEncoded] = shape[keyDecoded]!.encode(
          decoded[keyDecoded as keyof typeof decoded],
        );
      }
      return encoded;
    },
  };
}

export function jsonTypeObject<Shape extends { [key: string]: JsonType<any> }>(
  shape: Shape,
  keysEncoding?: { [K in keyof Shape]?: string },
): JsonType<{ [K in keyof Shape]: JsonTypeContent<Shape[K]> }> {
  return {
    ...jsonDecoderObject(shape, keysEncoding),
    ...jsonEncoderObject(shape, keysEncoding),
  } as JsonType<{ [K in keyof Shape]: JsonTypeContent<Shape[K]> }>;
}

export function jsonTypeObjectWithKeyEncoder<
  Shape extends { [key: string]: JsonType<any> },
>(shape: Shape, keyEncoder: (key: string) => string) {
  const keysEncoding = {} as { [K in keyof Shape]: string };
  for (const keyDecoded in shape) {
    keysEncoding[keyDecoded] = keyEncoder(keyDecoded);
  }
  return jsonTypeObject(shape, keysEncoding);
}

export function jsonTypeObjectToRecord<Value>(
  valueType: JsonType<Value>,
): JsonType<Record<string, Value>> {
  return {
    decode(encoded: JsonValue): Record<string, Value> {
      const object = jsonExpectObject(encoded);
      const decoded: Record<string, Value> = {};
      for (const key of Object.keys(object)) {
        decoded[key] = withContext(`JSON: Decode Object["${key}"] =>`, () =>
          valueType.decode(object[key]!),
        );
      }
      return decoded;
    },
    encode(decoded: Immutable<Record<string, Value>>): JsonValue {
      const encoded = {} as JsonObject;
      for (const [key, value] of Object.entries(decoded)) {
        encoded[key] = valueType.encode(value);
      }
      return encoded;
    },
  };
}

export function jsonTypeObjectToMap<Value>(
  valueType: JsonType<Value>,
): JsonType<Map<string, Value>> {
  return {
    decode(encoded: JsonValue): Map<string, Value> {
      const object = jsonExpectObject(encoded);
      const decoded = new Map<string, Value>();
      for (const key of Object.keys(object)) {
        decoded.set(
          key,
          withContext(`JSON: Decode Object["${key}"] =>`, () =>
            valueType.decode(object[key]!),
          ),
        );
      }
      return decoded;
    },
    encode(decoded: Immutable<Map<string, Value>>): JsonValue {
      const encoded = {} as JsonObject;
      for (const [key, val] of decoded.entries()) {
        encoded[key] = valueType.encode(val);
      }
      return encoded;
    },
  };
}

export function jsonTypeArrayToMap<Key, Value>(
  keyType: JsonType<Key>,
  valueType: JsonType<Value>,
): JsonType<Map<Key, Value>> {
  return {
    decode(encoded: JsonValue): Map<Key, Value> {
      const array = jsonExpectArray(encoded);
      const decoded = new Map<Key, Value>();
      for (let index = 0; index < array.length; index++) {
        const item = array[index]!;
        const keyValue = jsonExpectArray(item);
        if (keyValue.length !== 2) {
          throw new Error(`JSON: Expected key-value array of length 2`);
        }
        decoded.set(
          withContext(`JSON: Decode Array[${index}]["key"] =>`, () =>
            keyType.decode(keyValue[0]!),
          ),
          withContext(`JSON: Decode Array[${index}]["value"] =>`, () =>
            valueType.decode(keyValue[1]!),
          ),
        );
      }
      return decoded;
    },
    encode(decoded: Immutable<Map<Key, Value>>): JsonValue {
      const encoded = new Array<JsonValue>();
      for (const [key, val] of decoded.entries()) {
        encoded.push([keyType.encode(key), valueType.encode(val)]);
      }
      encoded.sort();
      return encoded;
    },
  };
}

export function jsonTypeNullable<Content>(
  contentType: JsonType<Content>,
): JsonType<Content | null> {
  return {
    decode(encoded: JsonValue): Content | null {
      if (encoded === null || encoded === undefined) {
        return null;
      }
      return contentType.decode(encoded);
    },
    encode(decoded: Immutable<Content | null>): JsonValue {
      if (decoded === null) {
        return null;
      }
      return contentType.encode(decoded);
    },
  };
}

export function jsonTypeOptional<Content>(
  contentType: JsonType<Content>,
): JsonType<Content | undefined> {
  return {
    decode(encoded: JsonValue): Content | undefined {
      if (encoded === null || encoded === undefined) {
        return undefined;
      }
      return contentType.decode(encoded);
    },
    encode(decoded: Immutable<Content | undefined>): JsonValue {
      if (decoded === undefined) {
        return undefined;
      }
      return contentType.encode(decoded);
    },
  };
}

export function jsonTypeArrayToVariant<Variant>(
  variantKey: string,
  variantType: JsonType<Variant>,
): JsonType<Variant> {
  return jsonTypeMapped(
    jsonTypeArrayToTuple([jsonTypeConst(variantKey), variantType]),
    {
      map: (unmapped) => unmapped[1]!,
      unmap: (mapped) => [variantKey, mapped] as [string, Immutable<Variant>],
    },
  );
}

export function jsonTypeObjectToVariant<Variant>(
  variantKey: string,
  variantType: JsonType<Variant>,
): JsonType<Variant> {
  return jsonTypeMapped(jsonTypeObject({ [variantKey]: variantType }), {
    map: (unmapped) => unmapped[variantKey]!,
    unmap: (mapped) => ({ [variantKey]: mapped }),
  });
}

export function jsonTypeWithDefault<Content>(
  contentType: JsonType<Content>,
  defaultConstructor: () => Content,
): JsonType<Content> {
  return {
    decode(encoded: JsonValue): Content {
      if (encoded === undefined) {
        return defaultConstructor();
      }
      return contentType.decode(encoded);
    },
    encode(decoded: Immutable<Content>): JsonValue {
      return contentType.encode(decoded);
    },
  };
}

export function jsonTypeWithDecodeFallbacks<Content>(
  currentType: JsonType<Content>,
  decodeFallbacks: Array<(value: JsonValue) => Content>,
): JsonType<Content> {
  return {
    decode(encoded: JsonValue): Content {
      const errors = new Array();
      try {
        return currentType.decode(encoded);
      } catch (error) {
        errors.push(error);
      }
      for (const decodeFallback of decodeFallbacks) {
        try {
          return decodeFallback(encoded);
        } catch (error) {
          errors.push(error);
        }
      }
      const separator = "\n---\n >> JSON: Decode error: ";
      throw new Error(
        `JSON: Decode with fallbacks failed: ${separator}${errors.join(separator)})`,
      );
    },
    encode: currentType.encode,
  };
}

export function jsonDecoderByType<Content>(decoders: {
  undefined?: () => Content;
  null?: () => Content;
  boolean?: (boolean: boolean) => Content;
  number?: (number: number) => Content;
  string?: (string: string) => Content;
  array?: (array: JsonArray) => Content;
  object?: (object: JsonObject) => Content;
}): JsonDecoder<Content> {
  return {
    decode(encoded: JsonValue) {
      if (encoded === undefined && decoders.undefined) {
        return decoders.undefined();
      }
      if (encoded === null && decoders.null) {
        return decoders.null();
      }
      const boolean = jsonAsBoolean(encoded);
      if (boolean !== undefined && decoders.boolean) {
        return decoders.boolean(boolean);
      }
      const number = jsonAsNumber(encoded);
      if (number !== undefined && decoders.number) {
        return decoders.number(number);
      }
      const string = jsonAsString(encoded);
      if (string !== undefined && decoders.string) {
        return decoders.string(string);
      }
      const array = jsonAsArray(encoded);
      if (array !== undefined && decoders.array) {
        return decoders.array(array);
      }
      const object = jsonAsObject(encoded);
      if (object !== undefined && decoders.object) {
        return decoders.object(object);
      }
      throw new Error(
        `JSON: Expected ${Object.keys(decoders).join("/")} (found: ${jsonPreview(encoded)})`,
      );
    },
  };
}

// TODO - how about decode/encode only objects/types
