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

export function jsonPreviewValue(value: JsonValue): string {
  if (jsonIsNull(value)) {
    return "Null";
  }
  const stringify = JSON.stringify(value);
  if (stringify.length > 30) {
    return stringify.slice(0, 37) + "..."; // TODO - we can do better than this
  }
  if (jsonIsBoolean(value)) {
    return `Boolean: ${stringify}`;
  }
  if (jsonIsNumber(value)) {
    return `Number: ${stringify}`;
  }
  if (jsonIsString(value)) {
    return `String: "${stringify}"`;
  }
  if (jsonIsArray(value)) {
    return `Array(x${(value as JsonArray).length}): ${stringify}`;
  }
  if (jsonIsObject(value)) {
    return `Object(x${Object.keys(value as JsonObject).length}): ${stringify}`;
  }
  throw new Error(`JSON: Unknown value: ${stringify}`);
}

export function jsonIsNull(value: JsonValue): boolean {
  return value === null;
}
export function jsonIsBoolean(value: JsonValue): boolean {
  return typeof value === "boolean" || value instanceof Boolean;
}
export function jsonIsNumber(value: JsonValue): boolean {
  return typeof value === "number" || value instanceof Number;
}
export function jsonIsString(value: JsonValue): boolean {
  return typeof value === "string" || value instanceof String;
}
export function jsonIsArray(value: JsonValue): boolean {
  return Array.isArray(value);
}
export function jsonIsObject(value: JsonValue): boolean {
  return typeof value === "object" && !jsonIsArray(value) && value !== null;
}

export function jsonIsIndexInArray(array: JsonArray, index: number): boolean {
  return index >= 0 && index < array.length;
}
export function jsonIsKeyInObject(object: JsonObject, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export function jsonExpectValueShallowEquals(
  found: JsonValue,
  expected: JsonValue,
) {
  if (found !== expected) {
    let foundPreview = jsonPreviewValue(found);
    let expectedPreview = jsonPreviewValue(expected);
    throw new Error(
      `JSON: Expected: ${expectedPreview} (found: ${foundPreview})`,
    );
  }
}

export function jsonExpectBoolean(value: JsonValue): boolean {
  if (!jsonIsBoolean(value)) {
    throw new Error(
      `JSON: Expected a boolean (found: ${jsonPreviewValue(value)})`,
    );
  }
  return value as boolean;
}
export function jsonExpectNumber(value: JsonValue): number {
  if (!jsonIsNumber(value)) {
    throw new Error(
      `JSON: Expected a number (found: ${jsonPreviewValue(value)})`,
    );
  }
  return value as number;
}
export function jsonExpectString(value: JsonValue): string {
  if (!jsonIsString(value)) {
    throw new Error(
      `JSON: Expected a string (found: ${jsonPreviewValue(value)})`,
    );
  }
  return value as string;
}
export function jsonExpectArray(value: JsonValue): JsonArray {
  if (!jsonIsArray(value)) {
    throw new Error(
      `JSON: Expected an array (found: ${jsonPreviewValue(value)})`,
    );
  }
  return value as JsonArray;
}
export function jsonExpectObject(value: JsonValue): JsonObject {
  if (!jsonIsObject(value)) {
    throw new Error(
      `JSON: Expected an object (found: ${jsonPreviewValue(value)})`,
    );
  }
  return value as JsonObject;
}

export function jsonExpectValueFromArray(
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
export function jsonExpectValueFromObject(
  object: JsonObject,
  key: string,
): JsonValue {
  const value = object[key];
  if (value === undefined) {
    throw new Error(
      `JSON: Expected object to contain key "${key}" (object keys: ${Object.keys(object).join(", ")})`,
    );
  }
  return value;
}

export function jsonExpectBooleanFromArray(
  array: JsonArray,
  index: number,
): boolean {
  return jsonExpectBoolean(jsonExpectValueFromArray(array, index));
}
export function jsonExpectNumberFromArray(
  array: JsonArray,
  index: number,
): number {
  return jsonExpectNumber(jsonExpectValueFromArray(array, index));
}
export function jsonExpectStringFromArray(
  array: JsonArray,
  index: number,
): string {
  return jsonExpectString(jsonExpectValueFromArray(array, index));
}
export function jsonExpectArrayFromArray(
  array: JsonArray,
  index: number,
): JsonArray {
  return jsonExpectArray(jsonExpectValueFromArray(array, index));
}
export function jsonExpectObjectFromArray(
  array: JsonArray,
  index: number,
): JsonObject {
  return jsonExpectObject(jsonExpectValueFromArray(array, index));
}

export function jsonExpectBooleanFromObject(
  object: JsonObject,
  key: string,
): boolean {
  return jsonExpectBoolean(jsonExpectValueFromObject(object, key));
}
export function jsonExpectNumberFromObject(
  object: JsonObject,
  key: string,
): number {
  return jsonExpectNumber(jsonExpectValueFromObject(object, key));
}
export function jsonExpectStringFromObject(
  object: JsonObject,
  key: string,
): string {
  return jsonExpectString(jsonExpectValueFromObject(object, key));
}
export function jsonExpectArrayFromObject(
  object: JsonObject,
  key: string,
): JsonArray {
  return jsonExpectArray(jsonExpectValueFromObject(object, key));
}
export function jsonExpectObjectFromObject(
  object: JsonObject,
  key: string,
): JsonObject {
  return jsonExpectObject(jsonExpectValueFromObject(object, key));
}
