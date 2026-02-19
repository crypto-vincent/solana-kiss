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
import { ErrorStack, withErrorContext } from "./Error";
import { Pubkey, pubkeyFromBase58, pubkeyToBase58 } from "./Pubkey";
import { Signature, signatureFromBase58, signatureToBase58 } from "./Signature";
import { utf8Decode, utf8Encode } from "./Utf8";
import {
  objectGetOwnProperty,
  objectGuessIntendedKey,
  OneKeyOf,
} from "./Utils";

/** Any valid JSON value: a primitive, an array, or an object. */
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;
/** A JSON primitive value: `null`, `boolean`, `number`, or `string`. */
export type JsonPrimitive = null | boolean | number | string;
/** A JSON array whose elements are {@link JsonValue}. */
export type JsonArray = Array<JsonValue>;
/** A JSON object with string keys and {@link JsonValue} values. */
export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

/** Narrows a {@link JsonValue} to `boolean`, or returns `undefined` if it is not a boolean. */
export function jsonAsBoolean(value: JsonValue): boolean | undefined {
  if (typeof value === "boolean" || value instanceof Boolean) {
    return value as boolean;
  }
  return undefined;
}
/** Narrows a {@link JsonValue} to `number`, or returns `undefined` if it is not a number. */
export function jsonAsNumber(value: JsonValue): number | undefined {
  if (typeof value === "number" || value instanceof Number) {
    return value as number;
  }
  return undefined;
}
/** Narrows a {@link JsonValue} to `string`, or returns `undefined` if it is not a string. */
export function jsonAsString(value: JsonValue): string | undefined {
  if (typeof value === "string" || value instanceof String) {
    return value as string;
  }
  return undefined;
}

/** Narrows a {@link JsonValue} to {@link JsonArray}, or returns `undefined` if it is not an array. */
export function jsonAsArray(value: JsonValue): JsonArray | undefined {
  if (Array.isArray(value)) {
    return value as JsonArray;
  }
  return undefined;
}
/** Narrows a {@link JsonValue} to {@link JsonObject}, or returns `undefined` if it is not an object. */
export function jsonAsObject(value: JsonValue): JsonObject | undefined {
  if (typeof value === "object" && !Array.isArray(value) && value !== null) {
    return value as JsonObject;
  }
  return undefined;
}

/** Returns a short, human-readable preview string of a {@link JsonValue}. */
export function jsonPreview(value: JsonValue): string {
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
    let previews = array.map(jsonPreview).join(",");
    if (previews.length > maxColumns) {
      previews = previews.slice(0, maxColumns - 3) + "...";
    }
    return `${array.length}x[${previews}]`;
  }
  const object = jsonAsObject(value);
  if (object !== undefined) {
    const previewEntries = new Array<string>();
    for (const key in object) {
      const value = object[key];
      if (value === undefined) {
        continue;
      }
      previewEntries.push(`${key}:${jsonPreview(value)}`);
    }
    let previewString = previewEntries.join(",");
    if (previewString.length > maxColumns) {
      previewString = previewString.slice(0, maxColumns - 3) + "...";
    }
    return `${previewEntries.length}x{${previewString}}`;
  }
  throw new Error(`JSON: Unknown value: ${value?.toString()}`);
}
/** Returns `true` if `leftValue` and `rightValue` are deeply equal JSON values. */
export function jsonIsDeepEqual(leftValue: JsonValue, rightValue: JsonValue) {
  if (leftValue === rightValue) {
    return true;
  }
  const leftArray = jsonAsArray(leftValue);
  if (leftArray !== undefined) {
    const rightArray = jsonAsArray(rightValue);
    if (rightArray === undefined || leftArray.length !== rightArray.length) {
      return false;
    }
    for (let index = 0; index < leftArray.length; index++) {
      if (!jsonIsDeepEqual(leftArray[index]!, rightArray[index]!)) {
        return false;
      }
    }
    return true;
  }
  const leftObject = jsonAsObject(leftValue);
  if (leftObject !== undefined) {
    const rightObject = jsonAsObject(rightValue);
    if (rightObject === undefined) {
      return false;
    }
    for (const leftObjectKey in leftObject) {
      const leftObjectValue = leftObject[leftObjectKey];
      if (leftObjectValue === undefined) {
        continue;
      }
      const rightObjectValue = objectGetOwnProperty(rightObject, leftObjectKey);
      if (rightObjectValue === undefined) {
        return false;
      }
      if (!jsonIsDeepEqual(leftObjectValue, rightObjectValue)) {
        return false;
      }
    }
    for (const rightObjectKey in rightObject) {
      const rightObjectValue = rightObject[rightObjectKey];
      if (rightObjectValue === undefined) {
        continue;
      }
      const leftObjectValue = objectGetOwnProperty(leftObject, rightObjectKey);
      if (leftObjectValue === undefined) {
        return false;
      }
      if (!jsonIsDeepEqual(leftObjectValue, rightObjectValue)) {
        return false;
      }
    }
    return true;
  }
  return false;
}
/**
 * Returns `true` if `subsetValue` is a deep subset of `supersetValue`.
 * Arrays are compared positionally up to the length of `subsetValue`;
 * object keys present in `subsetValue` must exist and match in `supersetValue`.
 */
export function jsonIsDeepSubset(
  subsetValue: JsonValue,
  supersetValue: JsonValue,
) {
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
    for (const subsetObjectKey in subsetObject) {
      const subsetObjectValue = subsetObject[subsetObjectKey]!;
      if (subsetObjectValue === undefined) {
        continue;
      }
      const supersetObjectValue = objectGetOwnProperty(
        supersetObject,
        subsetObjectKey,
      );
      if (supersetObjectValue === undefined) {
        return false;
      }
      if (!jsonIsDeepSubset(subsetObjectValue, supersetObjectValue)) {
        return false;
      }
    }
    return true;
  }
  return false;
}

/** A parsed JSON pointer represented as an ordered array of string (object key) or number (array index) tokens. */
export type JsonPointer = Array<string | number>;

/**
 * Parses a dot-notation or bracket-notation path string (e.g. `"foo.bar[0]"`)
 * into a {@link JsonPointer}.
 */
export function jsonPointerParse(path: string): JsonPointer {
  const tokens = path
    .replace(/\[(.*?)\]/g, ".$1")
    .replace(/\//g, ".")
    .split(".")
    .map((part) => {
      const trimmed = part.trim();
      if (trimmed === "") {
        return "";
      }
      const number = Number(trimmed);
      if (isNaN(number)) {
        return trimmed;
      }
      return number;
    });
  if (tokens.length >= 1 && tokens[0] === "") {
    return tokens.slice(1);
  }
  return tokens;
}
/**
 * Formats a {@link JsonPointer} (or a prefix up to `tokenIndex`) as a
 * human-readable path string.
 */
export function jsonPointerPreview(
  self: JsonPointer,
  tokenIndex?: number,
): string {
  const parts = [];
  const end = tokenIndex ? tokenIndex + 1 : self.length;
  for (let index = 0; index < end; index++) {
    const token = self[index]!;
    if (typeof token === "number" || token === "") {
      parts.push(`[${token}]`);
    } else {
      if (index > 0) {
        parts.push(".");
      }
      parts.push(token);
    }
  }
  return parts.join("");
}
/**
 * Converts a {@link JsonPointer} token to a valid non-negative array index for
 * an array of the given length, handling negative indices. Returns `undefined`
 * if the token is not a number or the resulting index is out of bounds.
 */
export function jsonPointerTokenAsArrayIndex(
  pointerToken: string | number,
  arrayLength: number,
): number | undefined {
  if (typeof pointerToken !== "number") {
    return undefined;
  }
  let arrayIndex = pointerToken;
  if (arrayIndex < 0) {
    arrayIndex = arrayIndex + arrayLength;
  }
  if (arrayIndex < 0 || arrayIndex >= arrayLength) {
    return undefined;
  }
  return arrayIndex;
}

/**
 * Retrieves the nested {@link JsonValue} at the given dot/bracket path string
 * or {@link JsonPointer} within `value`. Throws if any segment is invalid.
 */
export function jsonGetAt(
  value: JsonValue,
  pathOrPointer: string | JsonPointer,
): JsonValue {
  const pointer = Array.isArray(pathOrPointer)
    ? pathOrPointer
    : jsonPointerParse(pathOrPointer);
  let current = value;
  for (let tokenIndex = 0; tokenIndex < pointer.length; tokenIndex++) {
    const pointerToken = pointer[tokenIndex]!;
    const array = jsonAsArray(current);
    if (array !== undefined) {
      const arrayIndex = jsonPointerTokenAsArrayIndex(
        pointerToken,
        array.length,
      );
      if (arrayIndex === undefined) {
        throw new Error(
          `JSON: Expected path ${jsonPointerPreview(pointer, tokenIndex)} to be a valid index for an array of length ${array.length}`,
        );
      }
      current = array[arrayIndex]!;
      continue;
    }
    const object = jsonAsObject(current);
    if (object !== undefined) {
      const objectKey = objectGuessIntendedKey(object, pointerToken);
      const objectValue = objectGetOwnProperty(object, objectKey);
      if (objectValue === undefined) {
        throw new Error(
          `JSON: Expected path ${jsonPointerPreview(pointer, tokenIndex)} to be a valid key for an object (found keys: ${Object.keys(object).join("/")})`,
        );
      }
      current = objectValue;
      continue;
    }
    throw new Error(
      `JSON: Expected an object or array at path ${jsonPointerPreview(pointer, tokenIndex)} (found: ${jsonPreview(current)})`,
    );
  }
  return current;
}

/** Extracts the decoded content type `T` from a `JsonDecoder<T>`. */
export type JsonDecoderContent<S> = S extends JsonDecoder<infer T> ? T : never;
/** A function that decodes a {@link JsonValue} into a value of type `Content`. */
export type JsonDecoder<Content> = (encoded: JsonValue) => Content;

/** Extracts the decoded content type `T` from a `JsonEncoder<T>`. */
export type JsonEncoderContent<S> = S extends JsonEncoder<infer T> ? T : never;
/** A function that encodes a value of type `Content` into a {@link JsonValue}. */
export type JsonEncoder<Content> = (decoded: Content) => JsonValue;

/** Extracts the decoded content type `T` from a `JsonCodec<T>`. */
export type JsonCodecContent<S> = S extends JsonCodec<infer T> ? T : never;
/** A paired {@link JsonDecoder} and {@link JsonEncoder} for a given content type. */
export type JsonCodec<Content> = {
  decoder: JsonDecoder<Content>;
  encoder: JsonEncoder<Content>;
};

/** Identity {@link JsonCodec} for {@link JsonValue} — passes values through unchanged. */
export const jsonCodecValue: JsonCodec<JsonValue> = {
  decoder: (encoded) => encoded,
  encoder: (decoded) => decoded,
};

/** {@link JsonCodec} for `boolean` values. Throws if the encoded value is not a boolean. */
export const jsonCodecBoolean: JsonCodec<boolean> = {
  decoder: (encoded) => {
    const decoded = jsonAsBoolean(encoded);
    if (decoded === undefined) {
      throw new Error(
        `JSON: Expected a boolean (found: ${jsonPreview(encoded)})`,
      );
    }
    return decoded;
  },
  encoder: (decoded) => decoded,
};
/**
 * {@link JsonCodec} for `number` values.
 * Encodes `NaN`, `Infinity`, and `-Infinity` as their string representations
 * since JSON does not support these values natively.
 */
export const jsonCodecNumber: JsonCodec<number> = {
  decoder: jsonDecoderByType({
    number: (number) => number,
    string: (string) => {
      if (string === "NaN") {
        return NaN;
      }
      if (string === "Infinity") {
        return Infinity;
      }
      if (string === "-Infinity") {
        return -Infinity;
      }
      throw new Error(
        `JSON: Expected a number or "NaN"/"Infinity" (found: ${jsonPreview(string)})`,
      );
    },
  }),
  encoder: (decoded) => {
    if (isNaN(decoded)) {
      return "NaN";
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
/** {@link JsonCodec} for `string` values. Throws if the encoded value is not a string. */
export const jsonCodecString: JsonCodec<string> = {
  decoder: (encoded) => {
    const decoded = jsonAsString(encoded);
    if (decoded === undefined) {
      throw new Error(
        `JSON: Expected a string (found: ${jsonPreview(encoded)})`,
      );
    }
    return decoded;
  },
  encoder: (decoded) => decoded,
};

/** {@link JsonCodec} for {@link JsonArray} values. Throws if the encoded value is not an array. */
export const jsonCodecArray: JsonCodec<JsonArray> = {
  decoder: (encoded) => {
    const decoded = jsonAsArray(encoded);
    if (decoded === undefined) {
      throw new Error(
        `JSON: Expected an array (found: ${jsonPreview(encoded)})`,
      );
    }
    return decoded;
  },
  encoder: (decoded) => decoded,
};
/** {@link JsonCodec} for {@link JsonObject} values. Throws if the encoded value is not an object. */
export const jsonCodecObject: JsonCodec<JsonObject> = {
  decoder: (encoded) => {
    const decoded = jsonAsObject(encoded);
    if (decoded === undefined) {
      throw new Error(
        `JSON: Expected an object (found: ${jsonPreview(encoded)})`,
      );
    }
    return decoded;
  },
  encoder: (decoded) => decoded,
};

/**
 * {@link JsonCodec} for `bigint` values.
 * Accepts a JSON number or a decimal string (with optional `_` separators);
 * encodes as a decimal string.
 */
export const jsonCodecBigInt: JsonCodec<bigint> = {
  decoder: jsonDecoderByType({
    number: (number) => BigInt(number),
    string: (string) => {
      if (string.includes("_")) {
        return BigInt(string.replace(/_/g, ""));
      }
      return BigInt(string);
    },
  }),
  encoder: (decoded) => String(decoded),
};

/** {@link JsonCodec} for {@link Pubkey}, encoded as a Base58 string. */
export const jsonCodecPubkey: JsonCodec<Pubkey> = jsonCodecWrapped(
  jsonCodecString,
  {
    decoder: pubkeyFromBase58,
    encoder: pubkeyToBase58,
  },
);
/** {@link JsonCodec} for {@link Signature}, encoded as a Base58 string. */
export const jsonCodecSignature: JsonCodec<Signature> = jsonCodecWrapped(
  jsonCodecString,
  {
    decoder: signatureFromBase58,
    encoder: signatureToBase58,
  },
);
/** {@link JsonCodec} for {@link BlockHash}, encoded as a Base58 string. */
export const jsonCodecBlockHash: JsonCodec<BlockHash> = jsonCodecWrapped(
  jsonCodecString,
  {
    decoder: blockHashFromBase58,
    encoder: blockHashToBase58,
  },
);
/** {@link JsonCodec} for {@link BlockSlot}, encoded as a JSON number. */
export const jsonCodecBlockSlot: JsonCodec<BlockSlot> = jsonCodecWrapped(
  jsonCodecNumber,
  {
    decoder: blockSlotFromNumber,
    encoder: blockSlotToNumber,
  },
);
/** {@link JsonCodec} for `Date`, encoded as an ISO 8601 string. */
export const jsonCodecDateTime: JsonCodec<Date> = jsonCodecWrapped(
  jsonCodecString,
  {
    decoder: (encoded) => new Date(encoded),
    encoder: (decoded) => decoded.toISOString(),
  },
);

/** {@link JsonCodec} for `Uint8Array`, encoded as a JSON array of byte integers (0–255). */
export const jsonCodecArrayToBytes: JsonCodec<Uint8Array> = jsonCodecWrapped(
  jsonCodecArrayToArray(jsonCodecNumber),
  {
    decoder: (encoded) => {
      for (const byte of encoded) {
        if (byte < 0 || byte > 255 || !Number.isInteger(byte)) {
          throw new Error(
            `JSON: Expected integer between 0 and 255 (found: ${byte})`,
          );
        }
      }
      return new Uint8Array(encoded) as Uint8Array;
    },
    encoder: (decoded) => Array.from(decoded),
  },
);
/** {@link JsonCodec} for `Uint8Array`, encoded as a Base16 (hex) string. */
export const jsonCodecBase16ToBytes: JsonCodec<Uint8Array> = jsonCodecWrapped(
  jsonCodecString,
  { decoder: base16Decode, encoder: base16Encode },
);
/** {@link JsonCodec} for `Uint8Array`, encoded as a Base58 string. */
export const jsonCodecBase58ToBytes: JsonCodec<Uint8Array> = jsonCodecWrapped(
  jsonCodecString,
  { decoder: base58Decode, encoder: base58Encode },
);
/** {@link JsonCodec} for `Uint8Array`, encoded as a Base64 string. */
export const jsonCodecBase64ToBytes: JsonCodec<Uint8Array> = jsonCodecWrapped(
  jsonCodecString,
  { decoder: base64Decode, encoder: base64Encode },
);
/** {@link JsonCodec} for `Uint8Array`, encoded as a UTF-8 string. */
export const jsonCodecUtf8ToBytes: JsonCodec<Uint8Array> = jsonCodecWrapped(
  jsonCodecString,
  { decoder: utf8Encode, encoder: utf8Decode },
);

/** Creates a {@link JsonDecoder} that only accepts the specified literal primitive `values`. */
export function jsonDecoderConst<Values extends Array<JsonPrimitive>>(
  ...values: Values
): JsonDecoder<Values[number]> {
  return (encoded) => {
    for (const value of values) {
      if (encoded === value) {
        return value as Values[number];
      }
    }
    throw new Error(
      `JSON: Expected: ${values.join("/")} (found: ${jsonPreview(encoded)})`,
    );
  };
}
/** Creates a {@link JsonEncoder} that passes literal primitive values through unchanged. */
export function jsonEncoderConst<Values extends Array<JsonPrimitive>>(
  ..._values: Values
): JsonEncoder<Values[number]> {
  return (value) => value;
}
/** Creates a {@link JsonCodec} for specific literal primitive values. */
export function jsonCodecConst<Values extends Array<JsonPrimitive>>(
  ...values: Values
): JsonCodec<Values[number]> {
  return {
    decoder: jsonDecoderConst(...values),
    encoder: jsonEncoderConst(...values),
  };
}

/** Creates a {@link JsonDecoder} that decodes a JSON array into a typed `Array<Item>` using `itemDecoder` for each element. */
export function jsonDecoderArrayToArray<Item>(
  itemDecoder: JsonDecoder<Item>,
): JsonDecoder<Array<Item>> {
  return (encoded) => {
    const array = jsonAsArray(encoded);
    if (array === undefined) {
      throw new Error(
        `JSON: Expected an array (found: ${jsonPreview(encoded)})`,
      );
    }
    return array.map((item, index) =>
      withErrorContext(`JSON: Decode Array[${index}] =>`, () =>
        itemDecoder(item),
      ),
    );
  };
}
/** Creates a {@link JsonEncoder} that encodes a typed `Array<Item>` into a JSON array using `itemEncoder` for each element. */
export function jsonEncoderArrayToArray<Item>(
  itemEncoder: JsonEncoder<Item>,
): JsonEncoder<Array<Item>> {
  return (decoded) => decoded.map((item) => itemEncoder(item));
}
/** Creates a {@link JsonCodec} for homogeneous arrays, applying `itemCodec` to every element. */
export function jsonCodecArrayToArray<Item>(
  itemCodec: JsonCodec<Item>,
): JsonCodec<Array<Item>> {
  return {
    decoder: jsonDecoderArrayToArray(itemCodec.decoder),
    encoder: jsonEncoderArrayToArray(itemCodec.encoder),
  };
}

/**
 * Creates a {@link JsonDecoder} that decodes a positional JSON array into a
 * named object. Each key in `shape` maps to the decoder for the array element
 * at the corresponding position (in insertion order).
 */
export function jsonDecoderArrayToObject<
  Shape extends { [key: string]: JsonDecoder<any> },
>(
  shape: Shape,
): JsonDecoder<{ [K in keyof Shape]: JsonDecoderContent<Shape[K]> }> {
  return (encoded) => {
    const decoded = {} as { [K in keyof Shape]: JsonDecoderContent<Shape[K]> };
    const array = jsonCodecArray.decoder(encoded);
    let index = 0;
    for (const key in shape) {
      const valueEncoded = array[index++] ?? null;
      const valueDecoded = withErrorContext(
        `JSON: Decode Array[${index}] (${key}) =>`,
        () => shape[key]!(valueEncoded),
      );
      decoded[key] = valueDecoded;
    }
    return decoded;
  };
}
/**
 * Creates a {@link JsonEncoder} that encodes a named object into a positional
 * JSON array. Each key in `shape` maps to the encoder for the value at that
 * key, written to the array in insertion order.
 */
export function jsonEncoderArrayToObject<
  Shape extends { [key: string]: JsonEncoder<any> },
>(
  shape: Shape,
): JsonEncoder<{ [K in keyof Shape]: JsonEncoderContent<Shape[K]> }> {
  return (decoded) => {
    const encoded = [] as JsonArray;
    for (const key in shape) {
      const valueDecoded = objectGetOwnProperty(decoded, key);
      const valueEncoded = shape[key]!(valueDecoded);
      encoded.push(valueEncoded);
    }
    return encoded;
  };
}
/**
 * Creates a {@link JsonCodec} for objects whose JSON representation is a
 * positional array. Each key in `shape` corresponds to the codec for an
 * array element at that position (in insertion order).
 */
export function jsonCodecArrayToObject<
  Shape extends { [key: string]: JsonCodec<any> },
>(shape: Shape): JsonCodec<{ [K in keyof Shape]: JsonCodecContent<Shape[K]> }> {
  const decodeShape = Object.fromEntries(
    Object.entries(shape).map(([key, type]) => [key, type.decoder]),
  );
  const encodeShape = Object.fromEntries(
    Object.entries(shape).map(([key, type]) => [key, type.encoder]),
  );
  return {
    decoder: jsonDecoderArrayToObject(decodeShape),
    encoder: jsonEncoderArrayToObject(encodeShape),
  } as JsonCodec<{ [K in keyof Shape]: JsonCodecContent<Shape[K]> }>;
}

/** Creates a {@link JsonDecoder} that decodes a JSON array into a typed tuple, applying each item decoder by position. */
export function jsonDecoderArrayToTuple<
  const Items extends Array<JsonDecoder<any>>,
>(
  items: Items,
): JsonDecoder<{ [K in keyof Items]: JsonDecoderContent<Items[K]> }> {
  return (encoded) => {
    const decoded = [] as { [K in keyof Items]: JsonDecoderContent<Items[K]> };
    const array = jsonCodecArray.decoder(encoded);
    for (let index = 0; index < items.length; index++) {
      const itemEncoded = array[index] ?? null;
      const itemDecoded = withErrorContext(
        `JSON: Decode Array[${index}] =>`,
        () => items[index]!(itemEncoded),
      );
      decoded.push(itemDecoded);
    }
    return decoded;
  };
}
/** Creates a {@link JsonEncoder} that encodes a typed tuple into a JSON array, applying each item encoder by position. */
export function jsonEncoderArrayToTuple<
  const Items extends Array<JsonEncoder<any>>,
>(
  items: Items,
): JsonEncoder<{ [K in keyof Items]: JsonEncoderContent<Items[K]> }> {
  return (decoded) => {
    const encoded = [] as JsonArray;
    for (let index = 0; index < items.length; index++) {
      const itemDecoded = decoded[index];
      const itemEncoded = items[index]!(itemDecoded);
      encoded.push(itemEncoded);
    }
    return encoded;
  };
}
/** Creates a {@link JsonCodec} for fixed-length typed tuples, applying each item codec by position. */
export function jsonCodecArrayToTuple<
  const Items extends Array<JsonCodec<any>>,
>(items: Items): JsonCodec<{ [K in keyof Items]: JsonCodecContent<Items[K]> }> {
  return {
    decoder: jsonDecoderArrayToTuple(items.map((item) => item.decoder)),
    encoder: jsonEncoderArrayToTuple(items.map((item) => item.encoder)),
  } as JsonCodec<{ [K in keyof Items]: JsonCodecContent<Items[K]> }>;
}

/**
 * Creates a {@link JsonDecoder} that decodes a JSON object into a typed object
 * using a `shape` of per-key decoders. Optional `keysEncoding` maps decoded
 * key names to their encoded counterparts.
 */
export function jsonDecoderObjectToObject<
  Shape extends { [keyDecoded: string]: JsonDecoder<any> },
>(
  shape: Shape,
  options?: {
    keysEncoding?:
      | { [K in keyof Shape]: string }
      | ((keyDecoded: keyof Shape) => string);
  },
): JsonDecoder<{ [K in keyof Shape]: JsonDecoderContent<Shape[K]> }> {
  return (encoded) => {
    const decoded = {} as { [K in keyof Shape]: JsonDecoderContent<Shape[K]> };
    const object = jsonCodecObject.decoder(encoded);
    for (const keyDecoded in shape) {
      const keyEncoded = objectKeyEncode(keyDecoded, options?.keysEncoding);
      const valueEncoded =
        objectGetOwnProperty(
          object,
          objectGuessIntendedKey(object, keyEncoded),
        ) ?? null;
      const valueDecoded = withErrorContext(
        `JSON: Decode Object["${keyEncoded}"] (${keyDecoded}) =>`,
        () => shape[keyDecoded]!(valueEncoded),
      );
      decoded[keyDecoded] = valueDecoded;
    }
    return decoded;
  };
}
/**
 * Creates a {@link JsonEncoder} that encodes a typed object into a JSON object
 * using a `shape` of per-key encoders. Optional `keysEncoding` maps decoded
 * key names to their encoded counterparts.
 */
export function jsonEncoderObjectToObject<
  Shape extends { [keyDecoded: string]: JsonEncoder<any> },
>(
  shape: Shape,
  options?: {
    keysEncoding?:
      | { [K in keyof Shape]: string }
      | ((keyDecoded: keyof Shape) => string);
  },
): JsonEncoder<{ [K in keyof Shape]: JsonEncoderContent<Shape[K]> }> {
  return (decoded) => {
    const encoded = {} as JsonObject;
    for (const keyDecoded in shape) {
      const keyEncoded = objectKeyEncode(keyDecoded, options?.keysEncoding);
      const valueDecoded = objectGetOwnProperty(decoded, keyDecoded);
      const valueEncoded = shape[keyDecoded]!(valueDecoded);
      encoded[keyEncoded] = valueEncoded;
    }
    return encoded;
  };
}
/**
 * Creates a {@link JsonCodec} for a typed object with a `shape` of per-key
 * codecs. Optional `keysEncoding` maps decoded key names to their encoded
 * counterparts.
 */
export function jsonCodecObjectToObject<
  Shape extends { [keyDecoded: string]: JsonCodec<any> },
>(
  shape: Shape,
  options?: {
    keysEncoding?:
      | { [K in keyof Shape]: string }
      | ((keyDecoded: keyof Shape) => string);
  },
): JsonCodec<{ [K in keyof Shape]: JsonCodecContent<Shape[K]> }> {
  const decodeShape = Object.fromEntries(
    Object.entries(shape).map(([key, type]) => [key, type.decoder]),
  );
  const encodeShape = Object.fromEntries(
    Object.entries(shape).map(([key, type]) => [key, type.encoder]),
  );
  return {
    decoder: jsonDecoderObjectToObject(decodeShape as any, options as any),
    encoder: jsonEncoderObjectToObject(encodeShape as any, options as any),
  } as JsonCodec<{ [K in keyof Shape]: JsonCodecContent<Shape[K]> }>;
}

/**
 * Creates a {@link JsonDecoder} that decodes a JSON object into a `Map<Key, Value>`.
 * Each object key is decoded via `params.keyDecoder` and each value via
 * `params.valueDecoder`.
 */
export function jsonDecoderObjectToMap<Key, Value>(params: {
  keyDecoder: (keyEncoded: string) => Key;
  valueDecoder: JsonDecoder<Value>;
}): JsonDecoder<Map<Key, Value>> {
  return (encoded) => {
    const decoded = new Map<Key, Value>();
    const object = jsonCodecObject.decoder(encoded);
    for (const keyEncoded in object) {
      const valueEncoded = objectGetOwnProperty(object, keyEncoded);
      if (valueEncoded === undefined) {
        continue;
      }
      const keyDecoded = withErrorContext(
        `JSON: Decode Object Key "${keyEncoded}" =>`,
        () => params.keyDecoder(keyEncoded),
      );
      const valueDecoded = withErrorContext(
        `JSON: Decode Object["${keyEncoded}"] (${keyDecoded}) =>`,
        () => params.valueDecoder(valueEncoded),
      );
      decoded.set(keyDecoded, valueDecoded);
    }
    return decoded;
  };
}
/**
 * Creates a {@link JsonEncoder} that encodes a `Map<Key, Value>` into a JSON object.
 * Each key is encoded via `params.keyEncoder` and each value via
 * `params.valueEncoder`.
 */
export function jsonEncoderObjectToMap<Key, Value>(params: {
  keyEncoder: (keyDecoded: Key) => string;
  valueEncoder: JsonEncoder<Value>;
}): JsonEncoder<Map<Key, Value>> {
  return (decoded) => {
    const encoded = {} as JsonObject;
    for (const [keyDecoded, valueDecoded] of decoded.entries()) {
      const keyEncoded = params.keyEncoder(keyDecoded);
      const valueEncoded = params.valueEncoder(valueDecoded);
      encoded[keyEncoded] = valueEncoded;
    }
    return encoded;
  };
}
/**
 * Creates a {@link JsonCodec} for `Map<Key, Value>`, where the map is
 * represented as a JSON object with string keys.
 */
export function jsonCodecObjectToMap<Key, Value>(params: {
  keyCodec: {
    decoder: (keyEncoded: string) => Key;
    encoder: (keyDecoded: Key) => string;
  };
  valueCodec: JsonCodec<Value>;
}): JsonCodec<Map<Key, Value>> {
  return {
    decoder: jsonDecoderObjectToMap({
      keyDecoder: params.keyCodec.decoder,
      valueDecoder: params.valueCodec.decoder,
    }),
    encoder: jsonEncoderObjectToMap({
      keyEncoder: params.keyCodec.encoder,
      valueEncoder: params.valueCodec.encoder,
    }),
  };
}

/**
 * Creates a {@link JsonDecoder} that decodes a JSON object into a
 * `Record<string, Value>`, applying `valueDecoder` to each value.
 */
export function jsonDecoderObjectToRecord<Value>(
  valueDecoder: JsonDecoder<Value>,
): JsonDecoder<Record<string, Value>> {
  return (encoded) => {
    const decoded = {} as Record<string, Value>;
    const object = jsonCodecObject.decoder(encoded);
    for (const key in object) {
      const valueEncoded = objectGetOwnProperty(object, key);
      if (valueEncoded === undefined) {
        continue;
      }
      const valueDecoded = withErrorContext(
        `JSON: Decode Object["${key}"] (${key}) =>`,
        () => valueDecoder(valueEncoded),
      );
      decoded[key] = valueDecoded;
    }
    return decoded;
  };
}
/**
 * Creates a {@link JsonEncoder} that encodes a `Record<string, Value>` into a
 * JSON object, applying `valueEncoder` to each value.
 */
export function jsonEncoderObjectToRecord<Value>(
  valueEncoder: JsonEncoder<Value>,
): JsonEncoder<Record<string, Value>> {
  return (decoded) => {
    const encoded = {} as JsonObject;
    for (const key in decoded) {
      const valueDecoded = decoded[key]!;
      const valueEncoded = valueEncoder(valueDecoded);
      encoded[key] = valueEncoded;
    }
    return encoded;
  };
}
/** Creates a {@link JsonCodec} for `Record<string, Value>` objects. */
export function jsonCodecObjectToRecord<Value>(
  valueCodec: JsonCodec<Value>,
): JsonCodec<Record<string, Value>> {
  return {
    decoder: jsonDecoderObjectToRecord(valueCodec.decoder),
    encoder: jsonEncoderObjectToRecord(valueCodec.encoder),
  };
}

/**
 * Creates a {@link JsonDecoder} for a discriminated-union enum style: the JSON
 * object must have exactly one key from `shape`, and that key's value is
 * decoded by the corresponding decoder. The result is a single-key object.
 */
export function jsonDecoderObjectToEnum<
  Shape extends { [keyEncoded: string]: JsonDecoder<any> },
>(
  shape: Shape,
): JsonDecoder<OneKeyOf<{ [K in keyof Shape]: JsonDecoderContent<Shape[K]> }>> {
  const newShapeEntries = Object.entries(shape).map(([key, decoder]) => [
    key,
    (value: any) => ({ [key]: decoder(value) }),
  ]);
  return jsonDecoderOneOfKeys(Object.fromEntries(newShapeEntries)) as any;
}
/**
 * Creates a {@link JsonEncoder} for a discriminated-union enum style: encodes a
 * single-key object by applying the encoder for that key from `shape`.
 */
export function jsonEncoderObjectToEnum<
  Shape extends { [key: string]: JsonEncoder<any> },
>(
  shape: Shape,
): JsonEncoder<OneKeyOf<{ [K in keyof Shape]: JsonEncoderContent<Shape[K]> }>> {
  return (decoded) => {
    const key = Object.keys(decoded)[0]!;
    const valueDecoded = objectGetOwnProperty(decoded, key);
    const valueEncoded = shape[key]!(valueDecoded);
    return { [key]: valueEncoded } as JsonValue;
  };
}
/**
 * Creates a {@link JsonCodec} for a discriminated-union enum style where the
 * JSON representation is a single-key object.
 */
export function jsonCodecObjectToEnum<
  Shape extends { [key: string]: JsonCodec<any> },
>(
  shape: Shape,
): JsonCodec<OneKeyOf<{ [K in keyof Shape]: JsonCodecContent<Shape[K]> }>> {
  const decodeShape = Object.fromEntries(
    Object.entries(shape).map(([key, type]) => [key, type.decoder]),
  );
  const encodeShape = Object.fromEntries(
    Object.entries(shape).map(([key, type]) => [key, type.encoder]),
  );
  return {
    decoder: jsonDecoderObjectToEnum(decodeShape),
    encoder: jsonEncoderObjectToEnum(encodeShape),
  } as any;
}

/** Wraps a {@link JsonDecoder} to also accept `null`, returning `null` directly. */
export function jsonDecoderNullable<Content>(
  contentDecoder: (encoded: Exclude<JsonValue, null>) => Content,
): JsonDecoder<Content | null> {
  return (encoded) => {
    if (encoded === null) {
      return null;
    }
    return contentDecoder(encoded);
  };
}
/** Wraps a {@link JsonEncoder} to also handle `null`, encoding it as JSON `null`. */
export function jsonEncoderNullable<Content>(
  contentEncoder: (decoded: Exclude<Content, null>) => JsonValue,
): JsonEncoder<Content | null> {
  return (decoded: Content | null) => {
    if (decoded === null) {
      return null;
    }
    return contentEncoder(decoded as Exclude<Content, null>);
  };
}
/** Creates a {@link JsonCodec} that accepts `null` in addition to the wrapped content type. */
export function jsonCodecNullable<Content>(contentCodec: {
  decoder: (encoded: Exclude<JsonValue, null>) => Content;
  encoder: (decoded: Exclude<Content, null>) => JsonValue;
}): JsonCodec<Content | null> {
  return {
    decoder: jsonDecoderNullable(contentCodec.decoder),
    encoder: jsonEncoderNullable(contentCodec.encoder),
  };
}

/**
 * Creates a {@link JsonDecoder} by composing `decoderInner` (JSON → `Encoded`)
 * and `decoderOuter` (`Encoded` → `Decoded`).
 */
export function jsonDecoderWrapped<Decoded, Encoded>(
  decoderInner: (encoded: JsonValue) => Encoded,
  decoderOuter: (encoded: Encoded) => Decoded,
): JsonDecoder<Decoded> {
  return (encoded: JsonValue) => decoderOuter(decoderInner(encoded));
}
/**
 * Creates a {@link JsonEncoder} by composing `encoderOuter` (`Decoded` → `Encoded`)
 * and `encoderInner` (`Encoded` → JSON).
 */
export function jsonEncoderWrapped<Decoded, Encoded>(
  encoderInner: (decoded: Encoded) => JsonValue,
  encoderOuter: (decoded: Decoded) => Encoded,
): JsonEncoder<Decoded> {
  return (decoded: Decoded) => encoderInner(encoderOuter(decoded));
}
/**
 * Creates a {@link JsonCodec} by composing an `innerCodec` (handles JSON ↔ `Encoded`)
 * with an `outerCodec` (handles `Encoded` ↔ `Decoded`).
 */
export function jsonCodecWrapped<Decoded, Encoded>(
  innerCodec: {
    decoder: (encoded: JsonValue) => Encoded;
    encoder: (decoded: Encoded) => JsonValue;
  },
  outerCodec: {
    decoder: (encoded: Encoded) => Decoded;
    encoder: (decoded: Decoded) => Encoded;
  },
): JsonCodec<Decoded> {
  return {
    decoder: jsonDecoderWrapped(innerCodec.decoder, outerCodec.decoder),
    encoder: jsonEncoderWrapped(innerCodec.encoder, outerCodec.encoder),
  };
}

/**
 * Creates a {@link JsonDecoder} that decodes a JSON object (or bare string)
 * by dispatching on a single recognised key from `shape`. Throws if zero or
 * more than one matching key is found.
 */
export function jsonDecoderOneOfKeys<
  Shape extends { [key: string]: JsonDecoder<any> },
  Content,
>(shape: Shape): JsonDecoder<Content> {
  return (encoded) => {
    let object: JsonObject;
    const string = jsonAsString(encoded);
    if (string !== undefined) {
      object = { [string]: null } as JsonObject;
    } else {
      object = jsonCodecObject.decoder(encoded);
    }
    let found: { key: string; valueEncoded: JsonValue } | undefined = undefined;
    for (const key in shape) {
      const valueEncoded = objectGetOwnProperty(object, key);
      if (valueEncoded !== undefined) {
        if (found !== undefined) {
          throw new Error(
            `JSON: Expected key ${key} to be unique in enum (also found: ${found.key})`,
          );
        }
        found = { key, valueEncoded };
      }
    }
    if (found !== undefined) {
      const valueDecoded = withErrorContext(
        `JSON: Decode Object["${found.key}"] =>`,
        () => shape[found.key]!(found.valueEncoded),
      );
      return valueDecoded;
    }
    const expectedKeys = Object.keys(shape).join("/");
    const foundKeys = Object.keys(object).join("/");
    throw new Error(
      `JSON: Expected object with one of the keys: ${expectedKeys} (found: ${foundKeys})`,
    );
  };
}

/**
 * Creates a {@link JsonDecoder} that dispatches to the appropriate handler
 * based on the runtime JSON value type (`null`, `boolean`, `number`, `string`,
 * array, or object). Throws if no handler matches the actual type.
 */
export function jsonDecoderByType<Content>(decoders: {
  null?: () => Content;
  boolean?: (boolean: boolean) => Content;
  number?: (number: number) => Content;
  string?: (string: string) => Content;
  array?: (array: JsonArray) => Content;
  object?: (object: JsonObject) => Content;
}): JsonDecoder<Content> {
  return (encoded) => {
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

/**
 * Creates a {@link JsonDecoder} that runs every decoder in `shape` against the
 * same encoded value and collects all results into a single object keyed by
 * the shape's keys.
 */
export function jsonDecoderInParallel<
  Shape extends { [key: string]: JsonDecoder<any> },
>(
  shape: Shape,
): JsonDecoder<{ [K in keyof Shape]: JsonDecoderContent<Shape[K]> }> {
  return (encoded) => {
    const results = {} as { [K in keyof Shape]: JsonDecoderContent<Shape[K]> };
    for (const key in shape) {
      results[key] = shape[key]!(encoded);
    }
    return results;
  };
}

/**
 * Creates a {@link JsonDecoder} that tries each decoder in `decoders` in order,
 * returning the result of the first one that succeeds. Throws an aggregated
 * error if all decoders fail.
 */
export function jsonDecoderTrySequentially<Content>(
  decoders: Array<JsonDecoder<Content>>,
): JsonDecoder<Content> {
  return (encoded) => {
    const errors = [];
    for (const decoder of decoders) {
      try {
        return decoder(encoded);
      } catch (error) {
        errors.push(error);
      }
    }
    throw new ErrorStack(`JSON: All known decoders failed`, errors);
  };
}

function objectKeyEncode(
  keyDecoded: string,
  keysEncoding:
    | undefined
    | { [keyDecoded: string]: string }
    | ((keyDecoded: string) => string),
): string {
  if (keysEncoding === undefined) {
    return keyDecoded;
  }
  if (typeof keysEncoding === "function") {
    return keysEncoding(keyDecoded) ?? keyDecoded;
  }
  return keysEncoding[keyDecoded] ?? keyDecoded;
}
