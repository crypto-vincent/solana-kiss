import { base16Decode, base16Encode } from "./Base16";
import { base58Decode, base58Encode } from "./Base58";
import { base64Decode, base64Encode } from "./Base64";
import {
  BlockHash,
  blockHashFromBase58,
  blockHashToBase58,
  BlockSlot,
  blockSlotFromNumber,
  blockSlotToNumber,
} from "./Block";
import { Pubkey, pubkeyFromBase58, pubkeyToBase58 } from "./Pubkey";
import { Signature, signatureFromBase58, signatureToBase58 } from "./Signature";
import { utf8Decode, utf8Encode } from "./Utf8";
import { withContext } from "./Utils";

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

export function jsonKind(value: JsonValue): string {
  if (value === undefined) {
    return "undefined";
  }
  if (value === null) {
    return "null";
  }
  if (jsonAsBoolean(value) !== undefined) {
    return "boolean";
  }
  if (jsonAsNumber(value) !== undefined) {
    return "number";
  }
  if (jsonAsString(value) !== undefined) {
    return "string";
  }
  if (jsonAsArray(value) !== undefined) {
    return "array";
  }
  if (jsonAsObject(value) !== undefined) {
    return "object";
  }
  throw new Error(`JSON: Unknown value: ${value?.toString()}`);
}
export function jsonPreview(value: JsonValue): string {
  if (value === undefined) {
    return "undefined";
  }
  if (value === null) {
    return "null";
  }
  const boolean = jsonAsBoolean(value);
  if (boolean !== undefined) {
    return `${boolean}`;
  }
  const number = jsonAsNumber(value);
  if (number !== undefined) {
    return `${number}`;
  }
  const string = jsonAsString(value);
  if (string !== undefined) {
    return `"${string}"`;
  }
  const maxColumns = 40;
  const array = jsonAsArray(value);
  if (array !== undefined) {
    let previews = array.map(jsonPreview).join(", ");
    if (previews.length > maxColumns) {
      previews = previews.slice(0, maxColumns - 3) + "...";
    }
    return `${array.length}x[${previews}]`;
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
    return `${entries.length}x{${previews}}`;
  }
  throw new Error(`JSON: Unknown value: ${value?.toString()}`);
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
export function jsonGetAtPath(
  value: JsonValue,
  path: string | Array<string | number>,
  options?: {
    failOnMissing?: boolean;
  },
): JsonValue {
  const tokens = Array.isArray(path)
    ? path
    : path.replace(/\[(\w+)\]/g, ".$1").split(".");
  let currentValue = value;
  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
    const token = tokens[tokenIndex]!;
    const currentArray = jsonAsArray(currentValue);
    if (currentArray !== undefined) {
      const arrayIndex = Number(token);
      if (!isFinite(arrayIndex)) {
        throw new Error(`JSON: Expected a valid array index (found: ${token})`);
      }
      currentValue = currentArray[arrayIndex];
      continue;
    }
    const currentObject = jsonAsObject(currentValue);
    if (currentObject !== undefined) {
      currentValue = currentObject[token];
      continue;
    }
    if (options?.failOnMissing) {
      const pathSoFar = tokens.slice(0, tokenIndex).join(".");
      throw new Error(
        `JSON: Expected an object or array at path "${pathSoFar}" (found: ${jsonPreview(currentValue)})`,
      );
    } else {
      break;
    }
  }
  return currentValue;
}

export type JsonDecoderContent<S> = S extends JsonDecoder<infer T> ? T : never;
export type JsonDecoder<Content> = (encoded: JsonValue) => Content;

export type JsonEncoderContent<S> = S extends JsonEncoder<infer T> ? T : never;
export type JsonEncoder<Content> = (decoded: Content) => JsonValue;

export type JsonTypeContent<S> = S extends JsonType<infer T> ? T : never;
export type JsonType<Content> = {
  decoder: JsonDecoder<Content>;
  encoder: JsonEncoder<Content>;
};

export const jsonTypeValue: JsonType<JsonValue> = {
  decoder: (encoded: JsonValue): JsonValue => {
    if (encoded === undefined) {
      return undefined;
    }
    return JSON.parse(JSON.stringify(encoded));
  },
  encoder: (decoded: JsonValue): JsonValue => {
    if (decoded === undefined) {
      return undefined;
    }
    return JSON.parse(JSON.stringify(decoded));
  },
};
export const jsonTypeNull: JsonType<null> = {
  decoder: (encoded: JsonValue): null => {
    if (encoded !== null && encoded !== undefined) {
      throw new Error(`JSON: Expected a null (found: ${jsonPreview(encoded)})`);
    }
    return null;
  },
  encoder: (decoded: null): JsonValue => {
    return decoded;
  },
};
export const jsonTypeBoolean: JsonType<boolean> = {
  decoder: (encoded: JsonValue): boolean => {
    const decoded = jsonAsBoolean(encoded);
    if (decoded === undefined) {
      throw new Error(
        `JSON: Expected a boolean (found: ${jsonPreview(encoded)})`,
      );
    }
    return decoded;
  },
  encoder: (decoded: boolean): JsonValue => {
    return decoded;
  },
};
export const jsonTypeNumber: JsonType<number> = {
  decoder: jsonDecoderByKind({
    null: () => NaN,
    number: (number: number) => number,
    string: (string: string) => {
      if (string === "Infinity") {
        return Infinity;
      }
      if (string === "-Infinity") {
        return -Infinity;
      }
      throw new Error(
        `JSON: Expected a number (found: ${jsonPreview(string)})`,
      );
    },
  }),
  encoder: (decoded: number): JsonValue => {
    if (isNaN(decoded)) {
      return null;
    }
    if (decoded === Infinity) {
      return "Infinity";
    }
    if (decoded === -Infinity) {
      return "-Infinity";
    }
    return decoded;
  },
};
export const jsonTypeString: JsonType<string> = {
  decoder: (encoded: JsonValue): string => {
    const decoded = jsonAsString(encoded);
    if (decoded === undefined) {
      throw new Error(
        `JSON: Expected a string (found: ${jsonPreview(encoded)})`,
      );
    }
    return decoded;
  },
  encoder: (decoded: string): JsonValue => {
    return decoded;
  },
};
export const jsonTypeArrayRaw: JsonType<JsonArray> = {
  decoder: (encoded: JsonValue): JsonArray => {
    const decoded = jsonAsArray(encoded);
    if (decoded === undefined) {
      throw new Error(
        `JSON: Expected an array (found: ${jsonPreview(encoded)})`,
      );
    }
    return decoded;
  },
  encoder: (decoded: JsonArray): JsonValue => {
    return [...decoded] as JsonArray;
  },
};
export const jsonTypeObjectRaw: JsonType<JsonObject> = {
  decoder: (encoded: JsonValue): JsonObject => {
    const decoded = jsonAsObject(encoded);
    if (decoded === undefined) {
      throw new Error(
        `JSON: Expected an object (found: ${jsonPreview(encoded)})`,
      );
    }
    return decoded;
  },
  encoder: (decoded: JsonObject): JsonValue => {
    return { ...decoded } as JsonObject;
  },
};

export const jsonTypeInteger: JsonType<bigint> = {
  decoder: jsonDecoderByKind({
    number: (number: number) => BigInt(number),
    string: (string: string) => BigInt(string.replace(/_/g, "")),
  }),
  encoder: (decoded: bigint): JsonValue => {
    return String(decoded);
  },
};

export const jsonTypePubkey: JsonType<Pubkey> = jsonTypeTransform(
  jsonTypeString,
  {
    decoder: pubkeyFromBase58,
    encoder: pubkeyToBase58,
  },
);
export const jsonTypeSignature: JsonType<Signature> = jsonTypeTransform(
  jsonTypeString,
  {
    decoder: signatureFromBase58,
    encoder: signatureToBase58,
  },
);
export const jsonTypeBlockHash: JsonType<BlockHash> = jsonTypeTransform(
  jsonTypeString,
  {
    decoder: blockHashFromBase58,
    encoder: blockHashToBase58,
  },
);
export const jsonTypeBlockSlot: JsonType<BlockSlot> = jsonTypeTransform(
  jsonTypeNumber,
  {
    decoder: blockSlotFromNumber,
    encoder: blockSlotToNumber,
  },
);
export const jsonTypeDateTime: JsonType<Date> = jsonTypeTransform(
  jsonTypeString,
  {
    decoder: (encoded) => new Date(encoded),
    encoder: (decoded) => decoded.toISOString(),
  },
);

export const jsonTypeBytesArray: JsonType<Uint8Array> = jsonTypeTransform(
  jsonTypeArray(jsonTypeNumber),
  {
    decoder: (encoded) => new Uint8Array(encoded),
    encoder: (decoded) => Array.from(decoded),
  },
) as JsonType<Uint8Array>;
export const jsonTypeBytesBase16: JsonType<Uint8Array> = jsonTypeTransform(
  jsonTypeString,
  {
    decoder: base16Decode,
    encoder: base16Encode,
  },
) as JsonType<Uint8Array>;
export const jsonTypeBytesBase58: JsonType<Uint8Array> = jsonTypeTransform(
  jsonTypeString,
  {
    decoder: base58Decode,
    encoder: base58Encode,
  },
) as JsonType<Uint8Array>;
export const jsonTypeBytesBase64: JsonType<Uint8Array> = jsonTypeTransform(
  jsonTypeString,
  {
    decoder: base64Decode,
    encoder: base64Encode,
  },
) as JsonType<Uint8Array>;
export const jsonTypeBytesUtf8: JsonType<Uint8Array> = jsonTypeTransform(
  jsonTypeString,
  {
    decoder: utf8Encode,
    encoder: utf8Decode,
  },
) as JsonType<Uint8Array>;

export function jsonDecoderConst<Const extends boolean | number | string>(
  expected: Const,
) {
  return (encoded: JsonValue): Const => {
    if (encoded !== expected) {
      throw new Error(
        `JSON: Expected const: ${expected} (found: ${jsonPreview(encoded)})`,
      );
    }
    return expected;
  };
}
export function jsonEncoderConst<Const extends boolean | number | string>(
  expected: Const,
) {
  return (_: JsonValue): Const => {
    return expected;
  };
}
export function jsonTypeConst<Const extends boolean | number | string>(
  expected: Const,
): JsonType<Const> {
  return {
    decoder: jsonDecoderConst(expected),
    encoder: jsonEncoderConst(expected),
  };
}

export function jsonDecoderArray<Item>(
  itemDecoder: JsonDecoder<Item>,
): JsonDecoder<Array<Item>> {
  return (encoded: JsonValue): Array<Item> => {
    const array = jsonAsArray(encoded);
    if (array === undefined) {
      throw new Error(
        `JSON: Expected an array (found: ${jsonPreview(encoded)})`,
      );
    }
    return array.map((item, index) =>
      withContext(`JSON: Decode Array[${index}] =>`, () => itemDecoder(item)),
    );
  };
}
export function jsonEncoderArray<Item>(
  itemEncoder: JsonEncoder<Item>,
): JsonEncoder<Array<Item>> {
  return (decoded: Array<Item>): JsonValue => {
    return decoded.map((item) => itemEncoder(item));
  };
}
export function jsonTypeArray<Item>(
  itemType: JsonType<Item>,
): JsonType<Array<Item>> {
  return {
    decoder: jsonDecoderArray(itemType.decoder),
    encoder: jsonEncoderArray(itemType.encoder),
  };
}

export function jsonDecoderArrayToObject<
  Shape extends { [key: string]: JsonDecoder<any> },
>(
  shape: Shape,
): JsonDecoder<{ [K in keyof Shape]: JsonDecoderContent<Shape[K]> }> {
  return (
    encoded: JsonValue,
  ): {
    [K in keyof Shape]: JsonDecoderContent<Shape[K]>;
  } => {
    const decoded = {} as {
      [K in keyof Shape]: JsonDecoderContent<Shape[K]>;
    };
    const array = jsonTypeArrayRaw.decoder(encoded);
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
  Shape extends { [key: string]: JsonEncoder<any> },
>(
  shape: Shape,
): JsonEncoder<{ [K in keyof Shape]: JsonEncoderContent<Shape[K]> }> {
  return (decoded: {
    [K in keyof Shape]: JsonEncoderContent<Shape[K]>;
  }): JsonValue => {
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
    Object.entries(shape).map(([key, type]) => [key, type.decoder]),
  ) as { [K in keyof Shape]: JsonDecoder<any> };
  const encodeShape = Object.fromEntries(
    Object.entries(shape).map(([key, type]) => [key, type.encoder]),
  ) as { [K in keyof Shape]: JsonEncoder<any> };
  return {
    decoder: jsonDecoderArrayToObject(decodeShape),
    encoder: jsonEncoderArrayToObject(encodeShape),
  } as JsonType<{ [K in keyof Shape]: JsonTypeContent<Shape[K]> }>;
}

export function jsonDecoderObject<
  Shape extends { [key: string]: JsonDecoder<any> },
>(
  shape: Shape,
  keyEncoding?:
    | { [K in keyof Shape]?: string }
    | ((keyDecoded: Extract<keyof Shape, string>) => string),
): JsonDecoder<{ [K in keyof Shape]: JsonDecoderContent<Shape[K]> }> {
  return (
    encoded: JsonValue,
  ): {
    [K in keyof Shape]: JsonDecoderContent<Shape[K]>;
  } => {
    const decoded = {} as {
      [K in keyof Shape]: JsonDecoderContent<Shape[K]>;
    };
    const object = jsonTypeObjectRaw.decoder(encoded);
    for (const keyDecoded in shape) {
      const keyEncoded = jsonTypeObjectKeyEncoder(keyDecoded, keyEncoding);
      decoded[keyDecoded] = withContext(
        `JSON: Decode Object["${keyEncoded}"] =>`,
        () => shape[keyDecoded]!(object[keyEncoded]),
      );
    }
    return decoded;
  };
}
export function jsonEncoderObject<
  Shape extends { [key: string]: JsonEncoder<any> },
>(
  shape: Shape,
  keyEncoding?:
    | { [K in keyof Shape]?: string }
    | ((keyDecoded: Extract<keyof Shape, string>) => string),
): JsonEncoder<{ [K in keyof Shape]: JsonEncoderContent<Shape[K]> }> {
  return (decoded: {
    [K in keyof Shape]: JsonEncoderContent<Shape[K]>;
  }): JsonValue => {
    const encoded = {} as JsonObject;
    for (const keyDecoded in shape) {
      const keyEncoded = jsonTypeObjectKeyEncoder(keyDecoded, keyEncoding);
      encoded[keyEncoded] = shape[keyDecoded]!(
        decoded[keyDecoded as keyof typeof decoded],
      );
    }
    return encoded;
  };
}
export function jsonTypeObject<Shape extends { [key: string]: JsonType<any> }>(
  shape: Shape,
  keyEncoding?:
    | { [K in keyof Shape]?: string }
    | ((keyDecoded: Extract<keyof Shape, string>) => string),
): JsonType<{ [K in keyof Shape]: JsonTypeContent<Shape[K]> }> {
  const decodeShape = Object.fromEntries(
    Object.entries(shape).map(([key, type]) => [key, type.decoder]),
  ) as { [K in keyof Shape]: JsonDecoder<any> };
  const encodeShape = Object.fromEntries(
    Object.entries(shape).map(([key, type]) => [key, type.encoder]),
  ) as { [K in keyof Shape]: JsonEncoder<any> };
  return {
    decoder: jsonDecoderObject(decodeShape, keyEncoding as any),
    encoder: jsonEncoderObject(encodeShape, keyEncoding as any),
  } as JsonType<{ [K in keyof Shape]: JsonTypeContent<Shape[K]> }>;
}
function jsonTypeObjectKeyEncoder<Shape extends { [key: string]: any }>(
  keyDecoded: Extract<keyof Shape, string>,
  keyEncoding?:
    | { [K in keyof Shape]?: string }
    | ((keyDecoded: Extract<keyof Shape, string>) => string),
): string {
  if (keyEncoding === undefined) {
    return keyDecoded;
  }
  if (typeof keyEncoding === "function") {
    return keyEncoding(keyDecoded);
  }
  return keyEncoding[keyDecoded] ?? keyDecoded;
}

export function jsonDecoderObjectToMap<Key, Value>(params: {
  keyDecoder: (keyEncoded: string) => Key;
  valueDecoder: JsonDecoder<Value>;
}): JsonDecoder<Map<Key, Value>> {
  return (encoded: JsonValue): Map<Key, Value> => {
    const decoded = new Map<Key, Value>();
    const object = jsonTypeObjectRaw.decoder(encoded);
    for (const keyEncoded of Object.keys(object)) {
      const keyDecoded = params.keyDecoder(keyEncoded);
      decoded.set(
        keyDecoded,
        withContext(`JSON: Decode Object["${keyEncoded}"] =>`, () =>
          params.valueDecoder(object[keyEncoded]!),
        ),
      );
    }
    return decoded;
  };
}
export function jsonEncoderObjectToMap<Key, Value>(params: {
  keyEncoder: (keyDecoded: Key) => string;
  valueEncoder: JsonEncoder<Value>;
}): JsonEncoder<Map<Key, Value>> {
  return (decoded: Map<Key, Value>): JsonValue => {
    const encoded = {} as JsonObject;
    for (const [keyDecoded, val] of decoded.entries()) {
      const keyEncoded = params.keyEncoder(keyDecoded);
      encoded[keyEncoded] = params.valueEncoder(val);
    }
    return encoded;
  };
}
export function jsonTypeObjectToMap<Key, Value>(
  keyType: {
    keyEncoder: (keyDecoded: Key) => string;
    keyDecoder: (keyEncoded: string) => Key;
  },
  valueType: JsonType<Value>,
): JsonType<Map<Key, Value>> {
  return {
    decoder: jsonDecoderObjectToMap({
      keyDecoder: keyType.keyDecoder,
      valueDecoder: valueType.decoder,
    }),
    encoder: jsonEncoderObjectToMap({
      keyEncoder: keyType.keyEncoder,
      valueEncoder: valueType.encoder,
    }),
  };
}

export function jsonDecoderObjectKey<Content>(
  key: string,
  valueDecoder: JsonDecoder<Content>,
): JsonDecoder<Content> {
  return jsonDecoderTransform(
    jsonDecoderObject({ [key]: valueDecoder }),
    (unmapped) => unmapped[key]!,
  );
}
export function jsonEncoderObjectKey<Content>(
  key: string,
  valueEncoder: JsonEncoder<Content>,
): JsonEncoder<Content> {
  return jsonEncoderTransform(
    jsonEncoderObject({ [key]: valueEncoder }),
    (remapped) => ({ [key]: remapped }),
  );
}
export function jsonTypeObjectKey<Content>(
  key: string,
  valueType: JsonType<Content>,
): JsonType<Content> {
  return {
    decoder: jsonDecoderObjectKey(key, valueType.decoder),
    encoder: jsonEncoderObjectKey(key, valueType.encoder),
  };
}

export function jsonDecoderNullable<Content>(
  contentDecoder: JsonDecoder<Content>,
): JsonDecoder<Content | null> {
  return (encoded: JsonValue): Content | null => {
    if (encoded === null || encoded === undefined) {
      return null;
    }
    return contentDecoder(encoded);
  };
}
export function jsonEncoderNullable<Content>(
  contentEncoder: JsonEncoder<Content>,
): JsonEncoder<Content | null> {
  return (decoded: Content | null): JsonValue => {
    if (decoded === null) {
      return null;
    }
    return contentEncoder(decoded);
  };
}
export function jsonTypeNullable<Content>(
  contentType: JsonType<Content>,
): JsonType<Content | null> {
  return {
    decoder: jsonDecoderNullable(contentType.decoder),
    encoder: jsonEncoderNullable(contentType.encoder),
  };
}

export function jsonDecoderOptional<Content>(
  contentDecoder: JsonDecoder<Content>,
): JsonDecoder<Content | undefined> {
  return (encoded: JsonValue): Content | undefined => {
    if (encoded === null || encoded === undefined) {
      return undefined;
    }
    return contentDecoder(encoded);
  };
}
export function jsonEncoderOptional<Content>(
  contentEncoder: JsonEncoder<Content>,
): JsonEncoder<Content | undefined> {
  return (decoded: Content | undefined): JsonValue => {
    if (decoded === undefined) {
      return undefined;
    }
    return contentEncoder(decoded);
  };
}
export function jsonTypeOptional<Content>(
  contentType: JsonType<Content>,
): JsonType<Content | undefined> {
  return {
    decoder: jsonDecoderOptional(contentType.decoder),
    encoder: jsonEncoderOptional(contentType.encoder),
  };
}

export function jsonDecoderTransform<Decoded, Encoded>(
  decoderInner: JsonDecoder<Encoded>,
  decoderOuter: (encoded: Encoded) => Decoded,
): JsonDecoder<Decoded> {
  return (encoded: JsonValue): Decoded => {
    return decoderOuter(decoderInner(encoded));
  };
}
export function jsonEncoderTransform<Decoded, Encoded>(
  encoderInner: JsonEncoder<Encoded>,
  encoderOuter: (decoded: Decoded) => Encoded,
): JsonEncoder<Decoded> {
  return (decoded: Decoded): JsonValue => {
    return encoderInner(encoderOuter(decoded));
  };
}
export function jsonTypeTransform<Decoded, Encoded>(
  type: JsonType<Encoded>,
  conversion: {
    decoder: (encoded: Encoded) => Decoded;
    encoder: (decoded: Decoded) => Encoded;
  },
): JsonType<Decoded> {
  return {
    decoder: jsonDecoderTransform(type.decoder, conversion.decoder),
    encoder: jsonEncoderTransform(type.encoder, conversion.encoder),
  };
}

export function jsonDecoderCascade<Content>(
  decoders: Array<(value: JsonValue) => Content>,
): JsonDecoder<Content> {
  return (encoded: JsonValue): Content => {
    const errors = new Array();
    for (const decoder of decoders) {
      try {
        return decoder(encoded);
      } catch (error) {
        errors.push(error);
      }
    }
    const separator = "\n---\n >> JSON: Decode error: ";
    throw new Error(
      `JSON: Decode with cascades failed: ${separator}${errors.join(separator)})`,
    );
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
}): JsonDecoder<Content> {
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
export function jsonDecoderAsEnum<
  Shape extends { [key: string]: JsonDecoder<Content> },
  Content,
>(shape: Shape): JsonDecoder<Content> {
  return (encoded: JsonValue): Content => {
    const object = jsonTypeObjectRaw.decoder(encoded);
    let foundKey: string | undefined = undefined;
    for (const key in shape) {
      if (object.hasOwnProperty(key)) {
        if (foundKey !== undefined) {
          throw new Error(
            `JSON: Expected key ${foundKey} to be unique in enum (also found: ${key})`,
          );
        }
        foundKey = key;
      }
    }
    if (foundKey !== undefined) {
      return withContext(`JSON: Decode Enum["${foundKey}"] =>`, () =>
        shape[foundKey]!(object[foundKey]!),
      );
    }
    const expectedKeys = Object.keys(shape).join("/");
    const foundKeys = Object.keys(object).join("/");
    throw new Error(
      `JSON: Expected object with one of the keys: ${expectedKeys} (found: ${foundKeys})`,
    );
  };
}
export function jsonDecoderSplit<
  Shape extends [JsonDecoder<any>, ...JsonDecoder<any>[]],
>(
  decoders: Shape,
): JsonDecoder<{
  [K in keyof Shape]: JsonDecoderContent<Shape[K]>;
}> {
  return (encoded: JsonValue) => {
    return decoders.map((decoder) => decoder(encoded)) as any;
  };
}
