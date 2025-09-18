export type JsonValue =
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

export function previewJsonValue(value: JsonValue): string {
  if (isJsonNull(value)) {
    return 'Null';
  }
  const stringify = JSON.stringify(value);
  if (stringify.length > 30) {
    return stringify.slice(0, 37) + '...';
  }
  if (isJsonBoolean(value)) {
    return `Boolean: ${stringify}`;
  }
  if (isJsonNumber(value)) {
    return `Number: ${stringify}`;
  }
  if (isJsonString(value)) {
    return `String: "${stringify}"`;
  }
  if (isJsonArray(value)) {
    return `Array(x${(value as JsonArray).length}): ${stringify}`;
  }
  if (isJsonObject(value)) {
    return `Object(x${Object.keys(value as JsonObject).length}): ${stringify}`;
  }
  throw new Error(`JSON: Unknown value: ${stringify}`);
}

export function isJsonNull(value: JsonValue): boolean {
  return value === null;
}
export function isJsonBoolean(value: JsonValue): boolean {
  return typeof value === 'boolean' || value instanceof Boolean;
}
export function isJsonNumber(value: JsonValue): boolean {
  return typeof value === 'number' || value instanceof Number;
}
export function isJsonString(value: JsonValue): boolean {
  return typeof value === 'string' || value instanceof String;
}
export function isJsonArray(value: JsonValue): boolean {
  return Array.isArray(value);
}
export function isJsonObject(value: JsonValue): boolean {
  return typeof value === 'object' && !isJsonArray(value) && value !== null;
}

export function hasJsonValueInArray(array: JsonArray, index: number): boolean {
  return index >= 0 && index < array.length;
}
export function hasJsonValueInObject(object: JsonObject, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export function expectJsonValueShallowEquals(
  value: JsonValue,
  reference: JsonValue,
) {
  if (value !== reference) {
    let foundPreview = previewJsonValue(value);
    let expectedPreview = previewJsonValue(reference);
    throw new Error(
      `JSON: Expected: ${expectedPreview} (found: ${foundPreview})`,
    );
  }
}

export function expectJsonBoolean(value: JsonValue): boolean {
  if (!isJsonBoolean(value)) {
    throw new Error(
      `JSON: Expected a boolean (found: ${previewJsonValue(value)})`,
    );
  }
  return value as boolean;
}
export function expectJsonNumber(value: JsonValue): number {
  if (!isJsonNumber(value)) {
    throw new Error(
      `JSON: Expected a number (found: ${previewJsonValue(value)})`,
    );
  }
  return value as number;
}
export function expectJsonString(value: JsonValue): string {
  if (!isJsonString(value)) {
    throw new Error(
      `JSON: Expected a string (found: ${previewJsonValue(value)})`,
    );
  }
  return value as string;
}
export function expectJsonArray(value: JsonValue): JsonArray {
  if (!isJsonArray(value)) {
    throw new Error(
      `JSON: Expected an array (found: ${previewJsonValue(value)})`,
    );
  }
  return value as JsonArray;
}
export function expectJsonObject(value: JsonValue): JsonObject {
  if (!isJsonObject(value)) {
    throw new Error(
      `JSON: Expected an object (found: ${previewJsonValue(value)})`,
    );
  }
  return value as JsonObject;
}

export function expectJsonValueFromArray(
  array: JsonArray,
  index: number,
): JsonValue {
  const item = array[index];
  if (item === undefined) {
    throw new Error(
      `JSON: Expected value in array at index: ${index} (array length: ${array.length})`,
    );
  }
  return item;
}
export function expectJsonValueFromObject(
  object: JsonObject,
  key: string,
): JsonValue {
  const value = object[key];
  if (value === undefined) {
    throw new Error(
      `JSON: Expected object to contain key "${key}" (object keys: ${Object.keys(object).join(', ')})`,
    );
  }
  return value;
}

export function expectJsonBooleanFromArray(
  array: JsonArray,
  index: number,
): boolean {
  return expectJsonBoolean(expectJsonValueFromArray(array, index));
}
export function expectJsonNumberFromArray(
  array: JsonArray,
  index: number,
): number {
  return expectJsonNumber(expectJsonValueFromArray(array, index));
}
export function expectJsonStringFromArray(
  array: JsonArray,
  index: number,
): string {
  return expectJsonString(expectJsonValueFromArray(array, index));
}
export function expectJsonArrayFromArray(
  array: JsonArray,
  index: number,
): JsonArray {
  return expectJsonArray(expectJsonValueFromArray(array, index));
}
export function expectJsonObjectFromArray(
  array: JsonArray,
  index: number,
): JsonObject {
  return expectJsonObject(expectJsonValueFromArray(array, index));
}

export function expectJsonBooleanFromObject(
  object: JsonObject,
  key: string,
): boolean {
  return expectJsonBoolean(expectJsonValueFromObject(object, key));
}
export function expectJsonNumberFromObject(
  object: JsonObject,
  key: string,
): number {
  return expectJsonNumber(expectJsonValueFromObject(object, key));
}
export function expectJsonStringFromObject(
  object: JsonObject,
  key: string,
): string {
  return expectJsonString(expectJsonValueFromObject(object, key));
}
export function expectJsonArrayFromObject(
  object: JsonObject,
  key: string,
): JsonArray {
  return expectJsonArray(expectJsonValueFromObject(object, key));
}
export function expectJsonObjectFromObject(
  object: JsonObject,
  key: string,
): JsonObject {
  return expectJsonObject(expectJsonValueFromObject(object, key));
}
