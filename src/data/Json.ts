import { base16Decode, base16Encode } from "./Base16";
import { base58Decode, base58Encode } from "./Base58";
import { base64Decode, base64Encode } from "./Base64";
import {
  blockHashFromBase58,
  blockHashToBase58,
  blockSlotFromNumber,
  blockSlotToNumber,
} from "./Block";
import { ErrorStack, withErrorContext } from "./Error";
import { pubkeyFromBase58, pubkeyToBase58 } from "./Pubkey";
import { signatureFromBase58, signatureToBase58 } from "./Signature";
import { utf8Decode, utf8Encode } from "./Utf8";
import {
  objectGetOwnProperty,
  objectGuessIntendedKey,
  OneKeyOf,
} from "./Utils";

export type JsonValue = JsonPrimitive | JsonArray | JsonObject;
export type JsonPrimitive = null | boolean | number | string;
export type JsonArray = Array<JsonValue>;
export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

export function jsonAsBoolean(
  value: JsonValue | undefined,
): boolean | undefined {
  if (typeof value === "boolean" || value instanceof Boolean) {
    return value as boolean;
  }
  return undefined;
}
export function jsonAsNumber(value: JsonValue | undefined): number | undefined {
  if (typeof value === "number" || value instanceof Number) {
    return value as number;
  }
  return undefined;
}
export function jsonAsString(value: JsonValue | undefined): string | undefined {
  if (typeof value === "string" || value instanceof String) {
    return value as string;
  }
  return undefined;
}

export function jsonAsArray(
  value: JsonValue | undefined,
): JsonArray | undefined {
  if (Array.isArray(value)) {
    return value as JsonArray;
  }
  return undefined;
}
export function jsonAsObject(
  value: JsonValue | undefined,
): JsonObject | undefined {
  if (typeof value === "object" && !Array.isArray(value) && value !== null) {
    return value as JsonObject;
  }
  return undefined;
}

export function jsonPreview(value: JsonValue | undefined): string {
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
  leftValue: JsonValue | undefined,
  rightValue: JsonValue | undefined,
) {
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
      const rightObjectValue = objectGetOwnProperty(rightObject, leftObjectKey);
      if (!jsonIsDeepEqual(leftObjectValue, rightObjectValue)) {
        return false;
      }
    }
    for (const rightObjectKey in rightObject) {
      const leftObjectValue = objectGetOwnProperty(leftObject, rightObjectKey);
      const rightObjectValue = rightObject[rightObjectKey];
      if (!jsonIsDeepEqual(leftObjectValue, rightObjectValue)) {
        return false;
      }
    }
    return true;
  }
  return false;
}
export function jsonIsDeepSubset(
  subsetValue: JsonValue | undefined,
  supersetValue: JsonValue | undefined,
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
      if (!jsonIsDeepSubset(subsetArray[index], supersetArray[index])) {
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
      if (
        !jsonIsDeepSubset(
          subsetObject[key],
          objectGetOwnProperty(supersetObject, key),
        )
      ) {
        return false;
      }
    }
    return true;
  }
  return false;
}

export type JsonPointer = Array<string | number>;

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

export function jsonGetAt(
  value: JsonValue | undefined,
  pathOrPointer: string | JsonPointer,
  options?: {
    throwOnMissing?: boolean;
  },
) {
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
        if (options?.throwOnMissing) {
          throw new Error(
            `JSON: Expected path ${jsonPointerPreview(pointer, tokenIndex)} to be a valid index for an array of length ${array.length}`,
          );
        }
        return undefined;
      }
      current = array[arrayIndex];
      continue;
    }
    const object = jsonAsObject(current);
    if (object !== undefined) {
      current = objectGetOwnProperty(
        object,
        objectGuessIntendedKey(object, pointerToken),
      );
      continue;
    }
    if (options?.throwOnMissing) {
      throw new Error(
        `JSON: Expected an object or array at path ${jsonPointerPreview(pointer, tokenIndex)} (found: ${jsonPreview(current)})`,
      );
    }
    return undefined;
  }
  return current;
}

export type JsonDecoderContent<S> = S extends JsonDecoder<infer T> ? T : never;
export type JsonDecoder<Content> = (encoded: JsonValue | undefined) => Content;

export type JsonEncoderContent<S> = S extends JsonEncoder<infer T> ? T : never;
export type JsonEncoder<Content> = (decoded: Content) => JsonValue;

export type JsonCodecContent<S> = S extends JsonCodec<infer T> ? T : never;
export type JsonCodec<Content> = {
  decoder: JsonDecoder<Content>;
  encoder: JsonEncoder<Content>;
};

export const jsonCodecValue: JsonCodec<JsonValue> = {
  decoder: (encoded) => {
    if (encoded === undefined) {
      throw new Error(`JSON: Expected a value (found: undefined)`);
    }
    return encoded;
  },
  encoder: (decoded) => decoded,
};

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
  encoder: (decoded) => {
    return decoded;
  },
};
export const jsonCodecNumber: JsonCodec<number> = {
  decoder: jsonDecoderByType({
    null: () => NaN,
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
        `JSON: Expected a number or NaN/Infinity (found: ${jsonPreview(string)})`,
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

export const jsonCodecArrayValues: JsonCodec<JsonArray> = {
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
export const jsonCodecObjectValues: JsonCodec<JsonObject> = {
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

export const jsonCodecInteger: JsonCodec<bigint> = {
  decoder: jsonDecoderByType({
    number: (number) => BigInt(number),
    string: (string) => BigInt(string.replace(/_/g, "")),
  }),
  encoder: (decoded) => String(decoded),
};

export const jsonCodecPubkey = jsonCodecWrapped(jsonCodecString, {
  decoder: pubkeyFromBase58,
  encoder: pubkeyToBase58,
});
export const jsonCodecSignature = jsonCodecWrapped(jsonCodecString, {
  decoder: signatureFromBase58,
  encoder: signatureToBase58,
});
export const jsonCodecBlockHash = jsonCodecWrapped(jsonCodecString, {
  decoder: blockHashFromBase58,
  encoder: blockHashToBase58,
});
export const jsonCodecBlockSlot = jsonCodecWrapped(jsonCodecNumber, {
  decoder: blockSlotFromNumber,
  encoder: blockSlotToNumber,
});
export const jsonCodecDateTime = jsonCodecWrapped(jsonCodecString, {
  decoder: (encoded) => new Date(encoded),
  encoder: (decoded) => decoded.toISOString(),
});

export const jsonCodecBytesArray: JsonCodec<Uint8Array> = jsonCodecWrapped(
  jsonCodecArray(jsonCodecNumber),
  {
    decoder: (encoded) => new Uint8Array(encoded) as Uint8Array,
    encoder: (decoded) => Array.from(decoded),
  },
);
export const jsonCodecBytesBase16: JsonCodec<Uint8Array> = jsonCodecWrapped(
  jsonCodecString,
  { decoder: base16Decode, encoder: base16Encode },
);
export const jsonCodecBytesBase58: JsonCodec<Uint8Array> = jsonCodecWrapped(
  jsonCodecString,
  { decoder: base58Decode, encoder: base58Encode },
);
export const jsonCodecBytesBase64: JsonCodec<Uint8Array> = jsonCodecWrapped(
  jsonCodecString,
  { decoder: base64Decode, encoder: base64Encode },
);
export const jsonCodecBytesUtf8: JsonCodec<Uint8Array> = jsonCodecWrapped(
  jsonCodecString,
  { decoder: utf8Encode, encoder: utf8Decode },
);

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
export function jsonEncoderConst<Values extends Array<JsonPrimitive>>(
  ..._values: Values
): JsonEncoder<Values[number]> {
  return (value) => value;
}
export function jsonCodecConst<Values extends Array<JsonPrimitive>>(
  ...values: Values
): JsonCodec<Values[number]> {
  return {
    decoder: jsonDecoderConst(...values),
    encoder: jsonEncoderConst(...values),
  };
}

export function jsonDecoderArray<Item>(
  itemDecoder: (itemEncoded: JsonValue) => Item,
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
export function jsonEncoderArray<Item>(
  itemEncoder: (itemDecoded: Item) => JsonValue,
): JsonEncoder<Array<Item>> {
  return (decoded) => decoded.map((item) => itemEncoder(item));
}
export function jsonCodecArray<Item>(itemCodec: {
  decoder: (itemEncoded: JsonValue) => Item;
  encoder: (itemDecoded: Item) => JsonValue;
}): JsonCodec<Array<Item>> {
  return {
    decoder: jsonDecoderArray(itemCodec.decoder),
    encoder: jsonEncoderArray(itemCodec.encoder),
  };
}

export function jsonDecoderArrayToObject<
  Shape extends { [key: string]: JsonDecoder<any> },
>(
  shape: Shape,
): JsonDecoder<{ [K in keyof Shape]: JsonDecoderContent<Shape[K]> }> {
  return (encoded) => {
    const decoded = {} as { [K in keyof Shape]: JsonDecoderContent<Shape[K]> };
    const array = jsonCodecArrayValues.decoder(encoded);
    let index = 0;
    for (const key in shape) {
      const valueEncoded = array[index++];
      const valueDecoded = withErrorContext(
        `JSON: Decode Array[${index}] (${key}) =>`,
        () => shape[key]!(valueEncoded),
      );
      decoded[key] = valueDecoded;
    }
    return decoded;
  };
}
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

export function jsonDecoderArrayToTuple<Items extends Array<JsonDecoder<any>>>(
  ...items: Items
): JsonDecoder<{ [K in keyof Items]: JsonDecoderContent<Items[K]> }> {
  return (encoded) => {
    const decoded = [] as {
      [K in keyof Items]: JsonDecoderContent<Items[K]>;
    };
    const array = jsonCodecArrayValues.decoder(encoded);
    for (let index = 0; index < items.length; index++) {
      const itemEncoded = array[index];
      const itemDecoded = withErrorContext(
        `JSON: Decode Array[${index}] =>`,
        () => items[index]!(itemEncoded),
      );
      decoded.push(itemDecoded);
    }
    return decoded;
  };
}
export function jsonEncoderArrayToTuple<Items extends Array<JsonEncoder<any>>>(
  ...items: Items
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
export function jsonCodecArrayToTuple<Items extends Array<JsonCodec<any>>>(
  ...items: Items
): JsonCodec<{ [K in keyof Items]: JsonCodecContent<Items[K]> }> {
  return {
    decoder: jsonDecoderArrayToTuple(...items.map((item) => item.decoder)),
    encoder: jsonEncoderArrayToTuple(...items.map((item) => item.encoder)),
  } as JsonCodec<{ [K in keyof Items]: JsonCodecContent<Items[K]> }>;
}

export function jsonDecoderObject<
  Shape extends { [key: string]: JsonDecoder<any> },
>(
  shape: Shape,
  options?: {
    keysEncoding?:
      | { [K in keyof Shape]?: string }
      | ((keyDecoded: Extract<keyof Shape, string>) => string | undefined);
  },
): JsonDecoder<{ [K in keyof Shape]: JsonDecoderContent<Shape[K]> }> {
  return (encoded) => {
    const decoded = {} as { [K in keyof Shape]: JsonDecoderContent<Shape[K]> };
    const object = jsonCodecObjectValues.decoder(encoded);
    for (const keyDecoded in shape) {
      let keyEncoded = objectGuessIntendedKey(
        object,
        objectKeyEncode(keyDecoded, options?.keysEncoding),
      );
      const valueEncoded = objectGetOwnProperty(object, keyEncoded);
      const valueDecoded = withErrorContext(
        `JSON: Decode Object["${keyEncoded}"] (${keyDecoded}) =>`,
        () => shape[keyDecoded]!(valueEncoded),
      );
      decoded[keyDecoded] = valueDecoded;
    }
    return decoded;
  };
}
export function jsonEncoderObject<
  Shape extends { [key: string]: JsonEncoder<any> },
>(
  shape: Shape,
  options?: {
    keysEncoding?:
      | { [K in keyof Shape]?: string }
      | ((keyDecoded: Extract<keyof Shape, string>) => string | undefined);
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
export function jsonCodecObject<
  Shape extends { [key: string]: JsonCodec<any> },
>(
  shape: Shape,
  options?: {
    keysEncoding?:
      | { [K in keyof Shape]?: string }
      | ((keyDecoded: Extract<keyof Shape, string>) => string | undefined);
  },
): JsonCodec<{ [K in keyof Shape]: JsonCodecContent<Shape[K]> }> {
  const decodeShape = Object.fromEntries(
    Object.entries(shape).map(([key, type]) => [key, type.decoder]),
  );
  const encodeShape = Object.fromEntries(
    Object.entries(shape).map(([key, type]) => [key, type.encoder]),
  );
  return {
    decoder: jsonDecoderObject(decodeShape as any, options as any),
    encoder: jsonEncoderObject(encodeShape as any, options as any),
  } as JsonCodec<{ [K in keyof Shape]: JsonCodecContent<Shape[K]> }>;
}

export function jsonDecoderObjectToMap<Key, Value>(params: {
  keyDecoder: (keyEncoded: string) => Key;
  valueDecoder: (valueEncoded: JsonValue) => Value;
}): JsonDecoder<Map<Key, Value>> {
  return (encoded) => {
    const decoded = new Map<Key, Value>();
    const object = jsonCodecObjectValues.decoder(encoded);
    for (const keyEncoded of Object.keys(object)) {
      const valueEncoded = objectGetOwnProperty(object, keyEncoded);
      if (valueEncoded === undefined) {
        continue;
      }
      const keyDecoded = params.keyDecoder(keyEncoded);
      const valueDecoded = withErrorContext(
        `JSON: Decode Object["${keyEncoded}"] =>`,
        () => params.valueDecoder(valueEncoded),
      );
      decoded.set(keyDecoded, valueDecoded);
    }
    return decoded;
  };
}
export function jsonEncoderObjectToMap<Key, Value>(params: {
  keyEncoder: (keyDecoded: Key) => string;
  valueEncoder: (valueDecoded: Value) => JsonValue;
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
export function jsonCodecObjectToMap<Key, Value>(params: {
  keyCodec: {
    decoder: (keyEncoded: string) => Key;
    encoder: (keyDecoded: Key) => string;
  };
  valueCodec: {
    decoder: (valueEncoded: JsonValue) => Value;
    encoder: (valueDecoded: Value) => JsonValue;
  };
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

export function jsonDecoderObjectToEnum<
  Shape extends { [key: string]: JsonDecoder<any> },
>(
  shape: Shape,
): JsonDecoder<OneKeyOf<{ [K in keyof Shape]: JsonDecoderContent<Shape[K]> }>> {
  return jsonDecoderOneOfKeys(
    Object.fromEntries(
      Object.entries(shape).map(([key, decoder]) => [
        key,
        (value: any) => ({ [key]: decoder(value) }),
      ]),
    ) as any,
  ) as any;
}
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

export function jsonDecoderObjectKey<Content>(
  key: string,
  valueDecoder: JsonDecoder<Content>,
): JsonDecoder<Content> {
  return jsonDecoderWrapped(
    jsonDecoderObject({ [key]: valueDecoder }),
    (encoded) => encoded[key]!,
  );
}
export function jsonEncoderObjectKey<Content>(
  key: string,
  valueEncoder: JsonEncoder<Content>,
): JsonEncoder<Content> {
  return jsonEncoderWrapped(
    jsonEncoderObject({ [key]: valueEncoder }),
    (decoded) => ({ [key]: decoded }),
  );
}
export function jsonCodecObjectKey<Content>(
  key: string,
  valueCodec: JsonCodec<Content>,
): JsonCodec<Content> {
  return {
    decoder: jsonDecoderObjectKey(key, valueCodec.decoder),
    encoder: jsonEncoderObjectKey(key, valueCodec.encoder),
  };
}

export function jsonDecoderNullable<Content>(
  contentDecoder: (encoded: NonNullable<JsonValue>) => Content,
): JsonDecoder<Content | null> {
  return (encoded) => {
    if (encoded === undefined || encoded === null) {
      return null;
    }
    return contentDecoder(encoded);
  };
}
export function jsonEncoderNullable<Content>(
  contentEncoder: (decoded: NonNullable<Content>) => JsonValue,
): JsonEncoder<Content | null> {
  return (decoded: Content | null) => {
    if (decoded === undefined || decoded === null) {
      return null;
    }
    return contentEncoder(decoded);
  };
}
export function jsonCodecNullable<
  Content extends {} | undefined,
>(contentCodec: {
  decoder: (encoded: NonNullable<JsonValue>) => Content;
  encoder: (decoded: NonNullable<Content>) => JsonValue;
}): JsonCodec<Content | null> {
  return {
    decoder: jsonDecoderNullable(contentCodec.decoder),
    encoder: jsonEncoderNullable(contentCodec.encoder),
  };
}

export function jsonDecoderWrapped<Decoded, Encoded, JsonInput>(
  decoderInner: (encoded: JsonInput) => Encoded,
  decoderOuter: (encoded: Encoded) => Decoded,
) {
  return (encoded: JsonInput) => decoderOuter(decoderInner(encoded));
}
export function jsonEncoderWrapped<Decoded, Encoded>(
  encoderInner: (decoded: Encoded) => JsonValue,
  encoderOuter: (decoded: Decoded) => Encoded,
) {
  return (decoded: Decoded) => encoderInner(encoderOuter(decoded));
}
export function jsonCodecWrapped<Decoded, Encoded, JsonInput>(
  innerCodec: {
    decoder: (encoded: JsonInput) => Encoded;
    encoder: (decoded: Encoded) => JsonValue;
  },
  outerCodec: {
    decoder: (encoded: Encoded) => Decoded;
    encoder: (decoded: Decoded) => Encoded;
  },
) {
  return {
    decoder: jsonDecoderWrapped(innerCodec.decoder, outerCodec.decoder),
    encoder: jsonEncoderWrapped(innerCodec.encoder, outerCodec.encoder),
  };
}

export function jsonDecoderOneOfKeys<
  Shape extends { [key: string]: (encoded: JsonValue) => Content },
  Content,
>(shape: Shape): JsonDecoder<Content> {
  return (encoded) => {
    let object: JsonObject;
    const string = jsonAsString(encoded);
    if (string !== undefined) {
      object = { [string]: null } as JsonObject;
    } else {
      object = jsonCodecObjectValues.decoder(encoded);
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

export function jsonDecoderByType<Content>(decoders: {
  undefined?: () => Content;
  null?: () => Content;
  boolean?: (boolean: boolean) => Content;
  number?: (number: number) => Content;
  string?: (string: string) => Content;
  array?: (array: JsonArray) => Content;
  object?: (object: JsonObject) => Content;
}): JsonDecoder<Content> {
  return (encoded) => {
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

export function jsonDecoderMultiplexed<
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

export function jsonDecoderTryAnyOf<Content>(
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

function objectKeyEncode<KeyDecoded extends string>(
  keyDecoded: KeyDecoded,
  keysEncoding?:
    | { [K in KeyDecoded]?: string }
    | ((keyDecoded: KeyDecoded) => string | undefined),
): string {
  if (keysEncoding === undefined) {
    return keyDecoded;
  }
  if (typeof keysEncoding === "function") {
    return keysEncoding(keyDecoded) ?? keyDecoded;
  }
  return objectGetOwnProperty(keysEncoding, keyDecoded) ?? keyDecoded;
}
