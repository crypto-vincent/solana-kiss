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

export function jsonIsDeepSubset(
  subsetValue: JsonValue,
  supersetValue: JsonValue,
) {
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
      if (!jsonIsDeepSubset(subsetArray[index]!, supersetArray[index]!)) {
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
      if (!jsonIsDeepSubset(subsetObject[key]!, supersetObject[key])) {
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

export type JsonDecodeContent<S> = S extends JsonDecode<infer T> ? T : never;
export type JsonDecode<Content> = (encoded: JsonValue) => Content;

export type JsonEncodeContent<S> = S extends JsonEncode<infer T> ? T : never;
export type JsonEncode<Content> = (decoded: Immutable<Content>) => JsonValue;

export type JsonTypeContent<S> = S extends JsonType<infer T> ? T : never;
export type JsonType<Content> = {
  decode: JsonDecode<Content>;
  encode: JsonEncode<Content>;
};

export const jsonDecodeValue = (encoded: JsonValue): JsonValue => {
  if (encoded === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(encoded));
};
export const jsonEncodeValue = (decoded: Immutable<JsonValue>): JsonValue => {
  if (decoded === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(decoded));
};
export const jsonTypeValue: JsonType<JsonValue> = {
  encode: jsonEncodeValue,
  decode: jsonDecodeValue,
};

export const jsonDecodeBoolean = (encoded: JsonValue): boolean => {
  const decoded = jsonAsBoolean(encoded);
  if (decoded === undefined) {
    throw new Error(
      `JSON: Expected a boolean (found: ${jsonPreview(encoded)})`,
    );
  }
  return decoded;
};
export const jsonEncodeBoolean = (decoded: Immutable<boolean>): JsonValue => {
  return decoded;
};
export const jsonTypeBoolean: JsonType<boolean> = {
  encode: jsonEncodeBoolean,
  decode: jsonDecodeBoolean,
};

export const jsonDecodeNumber = (encoded: JsonValue): number => {
  const decoded = jsonAsNumber(encoded);
  if (decoded === undefined) {
    throw new Error(`JSON: Expected a number (found: ${jsonPreview(encoded)})`);
  }
  return decoded;
};
export const jsonEncodeNumber = (decoded: Immutable<number>): JsonValue => {
  return decoded;
};
export const jsonTypeNumber: JsonType<number> = {
  encode: jsonEncodeNumber,
  decode: jsonDecodeNumber,
};

export const jsonDecodeString = (encoded: JsonValue): string => {
  const decoded = jsonAsString(encoded);
  if (decoded === undefined) {
    throw new Error(`JSON: Expected a string (found: ${jsonPreview(encoded)})`);
  }
  return decoded;
};
export const jsonEncodeString = (decoded: Immutable<string>): JsonValue => {
  return decoded;
};
export const jsonTypeString: JsonType<string> = {
  encode: jsonEncodeString,
  decode: jsonDecodeString,
};

export const jsonDecodeArray = (encoded: JsonValue): JsonArray => {
  const decoded = jsonAsArray(encoded);
  if (decoded === undefined) {
    throw new Error(`JSON: Expected an array (found: ${jsonPreview(encoded)})`);
  }
  return decoded;
};
export const jsonEncodeArray = (decoded: Immutable<JsonArray>): JsonValue => {
  return [...decoded] as JsonArray;
};

export const jsonDecodeObject = (encoded: JsonValue): JsonObject => {
  const decoded = jsonAsObject(encoded);
  if (decoded === undefined) {
    throw new Error(
      `JSON: Expected an object (found: ${jsonPreview(encoded)})`,
    );
  }
  return decoded;
};
export const jsonEncodeObject = (decoded: Immutable<JsonObject>): JsonValue => {
  return { ...decoded } as JsonObject;
};

export type JsonPrimitive = undefined | null | boolean | number | string;
export function jsonDecoderConst<Const extends JsonPrimitive>(expected: Const) {
  return (encoded: JsonValue): Const => {
    if (encoded !== expected) {
      throw new Error(
        `JSON: Expected const: ${expected} (found: ${jsonPreview(encoded)})`,
      );
    }
    return expected;
  };
}
export function jsonEncoderConst<Const extends JsonPrimitive>(expected: Const) {
  return (_: Immutable<JsonValue>): Const => {
    return expected;
  };
}
export function jsonTypeConst<Const extends JsonPrimitive>(
  expected: Const,
): JsonType<Const> {
  return {
    decode: jsonDecoderConst(expected),
    encode: jsonEncoderConst(expected),
  };
}

export function jsonDecoderArray<Item>(
  itemDecode: JsonDecode<Item>,
): JsonDecode<Array<Item>> {
  return (encoded: JsonValue): Array<Item> => {
    const array = jsonAsArray(encoded);
    if (array === undefined) {
      throw new Error(
        `JSON: Expected an array (found: ${jsonPreview(encoded)})`,
      );
    }
    return array.map((item, index) =>
      withContext(`JSON: Decode Array[${index}] =>`, () => itemDecode(item)),
    );
  };
}
export function jsonEncoderArray<Item>(
  itemEncode: JsonEncode<Item>,
): JsonEncode<Array<Item>> {
  return (decoded: Immutable<Array<Item>>): JsonValue => {
    return decoded.map((item) => itemEncode(item));
  };
}
export function jsonTypeArray<Item>(
  itemType: JsonType<Item>,
): JsonType<Array<Item>> {
  return {
    decode: jsonDecoderArray(itemType.decode),
    encode: jsonEncoderArray(itemType.encode),
  };
}

export function jsonDecoderArrayToTuple<
  Items extends [JsonDecode<any>, ...Array<JsonDecode<any>>],
>(
  itemsDecodes: Items,
): JsonDecode<{ [K in keyof Items]: JsonDecodeContent<Items[K]> }> {
  return (
    encoded: JsonValue,
  ): {
    [K in keyof Items]: JsonDecodeContent<Items[K]>;
  } => {
    const decoded = [] as {
      [K in keyof Items]: JsonDecodeContent<Items[K]>;
    };
    const array = jsonExpectArray(encoded);
    for (let index = 0; index < itemsDecodes.length; index++) {
      decoded[index as keyof typeof decoded] = withContext(
        `JSON: Decode Array[${index}] =>`,
        () => itemsDecodes[index]!(array[index]),
      );
    }
    return decoded;
  };
}
export function jsonEncoderArrayToTuple<
  Items extends [JsonEncode<any>, ...Array<JsonEncode<any>>],
>(
  itemsEncodes: Items,
): JsonEncode<{ [K in keyof Items]: JsonEncodeContent<Items[K]> }> {
  return (
    decoded: Immutable<{ [K in keyof Items]: JsonEncodeContent<Items[K]> }>,
  ): JsonValue => {
    const encoded = new Array<JsonValue>();
    for (let index = 0; index < itemsEncodes.length; index++) {
      encoded.push(
        itemsEncodes[index]!(decoded[index as keyof typeof decoded]),
      );
    }
    return encoded;
  };
}
export function jsonTypeArrayToTuple<
  Items extends [JsonType<any>, ...Array<JsonType<any>>],
>(
  itemsTypes: Items,
): JsonType<{ [K in keyof Items]: JsonTypeContent<Items[K]> }> {
  return {
    decode: jsonDecoderArrayToTuple(
      itemsTypes.map((item) => item.decode) as [
        JsonDecode<any>,
        ...Array<JsonDecode<any>>,
      ],
    ),
    encode: jsonEncoderArrayToTuple(
      itemsTypes.map((item) => item.encode) as [
        JsonEncode<any>,
        ...JsonEncode<any>[],
      ],
    ),
  } as JsonType<{ [K in keyof Items]: JsonTypeContent<Items[K]> }>;
}

export function jsonDecoderArrayToObject<
  Shape extends { [key: string]: JsonDecode<any> },
>(
  shape: Shape,
): JsonDecode<{ [K in keyof Shape]: JsonDecodeContent<Shape[K]> }> {
  return (
    encoded: JsonValue,
  ): {
    [K in keyof Shape]: JsonDecodeContent<Shape[K]>;
  } => {
    const decoded = {} as {
      [K in keyof Shape]: JsonDecodeContent<Shape[K]>;
    };
    const array = jsonExpectArray(encoded);
    let index = 0;
    for (const key in shape) {
      decoded[key] = withContext(`JSON: Decode Array[${index}] =>`, () =>
        shape[key]!(array[index++]),
      );
    }
    return decoded;
  };
}
export function jsonEncoderArrayToObject<
  Shape extends { [key: string]: JsonEncode<any> },
>(
  shape: Shape,
): JsonEncode<{ [K in keyof Shape]: JsonEncodeContent<Shape[K]> }> {
  return (
    decoded: Immutable<{ [K in keyof Shape]: JsonEncodeContent<Shape[K]> }>,
  ): JsonValue => {
    const encoded = new Array<JsonValue>();
    let index = 0;
    for (const key in shape) {
      encoded[index++] = shape[key]!(decoded[key as keyof typeof decoded]);
    }
    return encoded;
  };
}
export function jsonTypeArrayToObject<
  Shape extends { [key: string]: JsonType<any> },
>(shape: Shape): JsonType<{ [K in keyof Shape]: JsonTypeContent<Shape[K]> }> {
  const decodeShape = Object.fromEntries(
    Object.entries(shape).map(([key, type]) => [key, type.decode]),
  ) as { [K in keyof Shape]: JsonDecode<any> };
  const encodeShape = Object.fromEntries(
    Object.entries(shape).map(([key, type]) => [key, type.encode]),
  ) as { [K in keyof Shape]: JsonEncode<any> };
  return {
    decode: jsonDecoderArrayToObject(decodeShape),
    encode: jsonEncoderArrayToObject(encodeShape),
  } as JsonType<{ [K in keyof Shape]: JsonTypeContent<Shape[K]> }>;
}

export function jsonDecoderObject<
  Shape extends { [key: string]: JsonDecode<any> },
>(
  shape: Shape,
  keysEncoding?: { [K in keyof Shape]?: string },
): JsonDecode<{ [K in keyof Shape]: JsonDecodeContent<Shape[K]> }> {
  return (
    encoded: JsonValue,
  ): {
    [K in keyof Shape]: JsonDecodeContent<Shape[K]>;
  } => {
    const decoded = {} as {
      [K in keyof Shape]: JsonDecodeContent<Shape[K]>;
    };
    const object = jsonExpectObject(encoded);
    for (const keyDecoded in shape) {
      const keyEncoded = keysEncoding?.[keyDecoded] ?? keyDecoded;
      decoded[keyDecoded] = withContext(
        `JSON: Decode Object["${keyEncoded}"] =>`,
        () => shape[keyDecoded]!(object[keyEncoded]),
      );
    }
    return decoded;
  };
}
export function jsonEncoderObject<
  Shape extends { [key: string]: JsonEncode<any> },
>(
  shape: Shape,
  keysEncoding?: { [K in keyof Shape]?: string },
): JsonEncode<{ [K in keyof Shape]: JsonEncodeContent<Shape[K]> }> {
  return (
    decoded: Immutable<{
      [K in keyof Shape]: JsonEncodeContent<Shape[K]>;
    }>,
  ): JsonValue => {
    const encoded = {} as JsonObject;
    for (const keyDecoded in shape) {
      const keyEncoded = keysEncoding?.[keyDecoded] ?? keyDecoded;
      encoded[keyEncoded] = shape[keyDecoded]!(
        decoded[keyDecoded as keyof typeof decoded],
      );
    }
    return encoded;
  };
}
export function jsonTypeObject<Shape extends { [key: string]: JsonType<any> }>(
  shape: Shape,
  keysEncoding?: { [K in keyof Shape]?: string },
): JsonType<{ [K in keyof Shape]: JsonTypeContent<Shape[K]> }> {
  const decodeShape = Object.fromEntries(
    Object.entries(shape).map(([key, type]) => [key, type.decode]),
  ) as { [K in keyof Shape]: JsonDecode<any> };
  const encodeShape = Object.fromEntries(
    Object.entries(shape).map(([key, type]) => [key, type.encode]),
  ) as { [K in keyof Shape]: JsonEncode<any> };
  return {
    decode: jsonDecoderObject(decodeShape, keysEncoding),
    encode: jsonEncoderObject(encodeShape, keysEncoding),
  } as JsonType<{ [K in keyof Shape]: JsonTypeContent<Shape[K]> }>;
}

/*
export function jsonTypeObjectWithKeyEncode<
  Shape extends { [key: string]: JsonType<any> },
>(shape: Shape, keyEncode: (key: string) => string) {
  const keysEncoding = {} as { [K in keyof Shape]: string };
  for (const keyDecoded in shape) {
    keysEncoding[keyDecoded] = keyEncode(keyDecoded);
  }
  return jsonTypeObject(shape, keysEncoding);
}
  */

export function jsonDecoderObjectToRecord<Value>(
  valueDecode: JsonDecode<Value>,
): JsonDecode<Record<string, Value>> {
  return (encoded: JsonValue): Record<string, Value> => {
    const decoded: Record<string, Value> = {};
    const object = jsonExpectObject(encoded);
    for (const key of Object.keys(object)) {
      decoded[key] = withContext(`JSON: Decode Object["${key}"] =>`, () =>
        valueDecode(object[key]!),
      );
    }
    return decoded;
  };
}
export function jsonEncoderObjectToRecord<Value>(
  valueEncode: JsonEncode<Value>,
): JsonEncode<Record<string, Value>> {
  return (decoded: Immutable<Record<string, Value>>): JsonValue => {
    const encoded = {} as JsonObject;
    for (const [key, value] of Object.entries(decoded)) {
      encoded[key] = valueEncode(value);
    }
    return encoded;
  };
}
export function jsonTypeObjectToRecord<Value>(
  valueType: JsonType<Value>,
): JsonType<Record<string, Value>> {
  return {
    decode: jsonDecoderObjectToRecord(valueType.decode),
    encode: jsonEncoderObjectToRecord(valueType.encode),
  };
}

export function jsonDecoderObjectToMap<Value>(
  valueDecode: JsonDecode<Value>,
): JsonDecode<Map<string, Value>> {
  return (encoded: JsonValue): Map<string, Value> => {
    const decoded = new Map<string, Value>();
    const object = jsonExpectObject(encoded);
    for (const key of Object.keys(object)) {
      decoded.set(
        key,
        withContext(`JSON: Decode Object["${key}"] =>`, () =>
          valueDecode(object[key]!),
        ),
      );
    }
    return decoded;
  };
}
export function jsonEncoderObjectToMap<Value>(
  valueEncode: JsonEncode<Value>,
): JsonEncode<Map<string, Value>> {
  return (decoded: Immutable<Map<string, Value>>): JsonValue => {
    const encoded = {} as JsonObject;
    for (const [key, val] of decoded.entries()) {
      encoded[key] = valueEncode(val);
    }
    return encoded;
  };
}
export function jsonTypeObjectToMap<Value>(
  valueType: JsonType<Value>,
): JsonType<Map<string, Value>> {
  return {
    decode: jsonDecoderObjectToMap(valueType.decode),
    encode: jsonEncoderObjectToMap(valueType.encode),
  };
}

export function jsonDecoderArrayToMap<Key, Value>(
  keyDecode: JsonDecode<Key>,
  valueDecode: JsonDecode<Value>,
): JsonDecode<Map<Key, Value>> {
  return (encoded: JsonValue): Map<Key, Value> => {
    const array = jsonExpectArray(encoded);
    const decoded = new Map<Key, Value>();
    for (let index = 0; index < array.length; index++) {
      const keyValue = jsonExpectArray(array[index]!);
      if (keyValue.length !== 2) {
        throw new Error(`JSON: Expected key-value array of length 2`);
      }
      decoded.set(
        withContext(`JSON: Decode Array[${index}]["key"] =>`, () =>
          keyDecode(keyValue[0]!),
        ),
        withContext(`JSON: Decode Array[${index}]["value"] =>`, () =>
          valueDecode(keyValue[1]!),
        ),
      );
    }
    return decoded;
  };
}
export function jsonEncoderArrayToMap<Key, Value>(
  keyEncode: JsonEncode<Key>,
  valueEncode: JsonEncode<Value>,
): JsonEncode<Map<Key, Value>> {
  return (decoded: Immutable<Map<Key, Value>>): JsonValue => {
    const encoded = new Array<JsonValue>();
    for (const [key, val] of decoded.entries()) {
      encoded.push([keyEncode(key), valueEncode(val)]);
    }
    encoded.sort();
    return encoded;
  };
}
export function jsonTypeArrayToMap<Key, Value>(
  keyType: JsonType<Key>,
  valueType: JsonType<Value>,
): JsonType<Map<Key, Value>> {
  return {
    decode: jsonDecoderArrayToMap(keyType.decode, valueType.decode),
    encode: jsonEncoderArrayToMap(keyType.encode, valueType.encode),
  };
}

export function jsonDecoderNullable<Content>(
  contentDecode: JsonDecode<Content>,
): JsonDecode<Content | null> {
  return (encoded: JsonValue): Content | null => {
    if (encoded === null || encoded === undefined) {
      return null;
    }
    return contentDecode(encoded);
  };
}
export function jsonEncoderNullable<Content>(
  contentEncode: JsonEncode<Content>,
): JsonEncode<Content | null> {
  return (decoded: Immutable<Content | null>): JsonValue => {
    if (decoded === null) {
      return null;
    }
    return contentEncode(decoded);
  };
}
export function jsonTypeNullable<Content>(
  contentType: JsonType<Content>,
): JsonType<Content | null> {
  return {
    decode: jsonDecoderNullable(contentType.decode),
    encode: jsonEncoderNullable(contentType.encode),
  };
}

export function jsonDecoderOptional<Content>(
  contentDecode: JsonDecode<Content>,
): JsonDecode<Content | undefined> {
  return (encoded: JsonValue): Content | undefined => {
    if (encoded === null || encoded === undefined) {
      return undefined;
    }
    return contentDecode(encoded);
  };
}
export function jsonEncoderOptional<Content>(
  contentEncode: JsonEncode<Content>,
): JsonEncode<Content | undefined> {
  return (decoded: Immutable<Content | undefined>): JsonValue => {
    if (decoded === undefined) {
      return undefined;
    }
    return contentEncode(decoded);
  };
}
export function jsonTypeOptional<Content>(
  contentType: JsonType<Content>,
): JsonType<Content | undefined> {
  return {
    decode: jsonDecoderOptional(contentType.decode),
    encode: jsonEncoderOptional(contentType.encode),
  };
}

/*
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
  */

export function jsonDecoderMap<Mapped, Unmapped>(
  unmappedDecode: JsonDecode<Unmapped>,
  map: (unmapped: Unmapped) => Mapped,
): JsonDecode<Mapped> {
  return (encoded: JsonValue): Mapped => {
    return map(unmappedDecode(encoded));
  };
}
export function jsonEncoderMap<Mapped, Unmapped>(
  unmappedEncode: JsonEncode<Unmapped>,
  unmap: (mapped: Immutable<Mapped>) => Immutable<Unmapped>,
): JsonEncode<Mapped> {
  return (decoded: Immutable<Mapped>): JsonValue => {
    return unmappedEncode(unmap(decoded));
  };
}
export function jsonTypeMap<Mapped, Unmapped>(
  unmappedType: JsonType<Unmapped>,
  map: (unmapped: Unmapped) => Mapped,
  unmap: (mapped: Immutable<Mapped>) => Immutable<Unmapped>,
): JsonType<Mapped> {
  return {
    decode: jsonDecoderMap(unmappedType.decode, map),
    encode: jsonEncoderMap(unmappedType.encode, unmap),
  };
}

// TODO - this should take a shape as type parameter instead for keyed parts
export function jsonDecoderMerged<Content, Part1, Part2>(
  decoder1: JsonDecode<Part1>,
  decoder2: JsonDecode<Part2>,
  merge: (part1: Part1, part2: Part2) => Content,
): JsonDecode<Content> {
  return (encoded: JsonValue): Content => {
    const part1 = decoder1(encoded);
    const part2 = decoder2(encoded);
    return merge(part1, part2);
  };
}
export function jsonDecoderByKind<Content>(decoders: {
  undefined?: () => Content;
  null?: () => Content;
  boolean?: (boolean: boolean) => Content;
  number?: (number: number) => Content;
  string?: (string: string) => Content;
  array?: (array: JsonArray) => Content;
  object?: (object: JsonObject) => Content;
}): JsonDecode<Content> {
  return (encoded: JsonValue) => {
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
  };
}

export function jsonDecoderRecursive<Content>(
  getter: () => JsonDecode<Content>,
): JsonDecode<Content> {
  return (encoded: JsonValue): Content => getter()(encoded);
}

export function jsonDecoderEnum<
  Shape extends { [key: string]: JsonDecode<Content> },
  Content,
>(shape: Shape): JsonDecode<Content> {
  return (encoded: JsonValue): Content => {
    const object = jsonExpectObject(encoded);
    const keys = Object.keys(object);
    if (keys.length !== 1) {
      throw new Error(
        `JSON: Expected an object with a single key (found: ${keys.join("/")})`,
      );
    }
    // TODO - better error message
    const key = keys[0]!;
    const decoder = shape[key as keyof Shape];
    if (decoder === undefined) {
      throw new Error(
        `JSON: Unexpected key "${key}" (found: ${jsonPreview(encoded)})`,
      );
    }
    return withContext(`JSON: Decode Object["${key}"] =>`, () =>
      decoder(object[key]!),
    );
  };
}
