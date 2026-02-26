import {
  casingLosslessConvertToCamel,
  casingLosslessConvertToSnake,
} from "./Casing";
import { ErrorStack } from "./Error";

/**
 * Constructs a union type where exactly one key of `T` is present and all others are absent.
 * Useful for discriminated union–like objects without a discriminant field.
 */
export type OneKeyOf<T extends Record<string, any>> = {
  [K in keyof T]: { [P in K]: T[P] } & { [Q in Exclude<keyof T, K>]?: never };
}[keyof T];

/**
 * Represents either a successful value or an error.
 * Exactly one of `value` or `error` is present.
 */
export type Result<Value, Error = any> = OneKeyOf<{
  value: Value;
  error: Error;
}>;

/**
 * Creates a nominal (branded) type from an underlying type `T` and a unique brand `Name`.
 * Prevents accidental mixing of values that share the same underlying type.
 */
export type Branded<T, Name> =
  | (T & { readonly __unique: symbol })
  | { readonly __brand: Name };

/**
 * Asserts that a value is defined (not `undefined`), throwing if it is.
 * @param value - The value to check.
 * @param context - Optional additional context to include in the error message.
 * @returns The value, narrowed to exclude `undefined`.
 * @throws {ErrorStack} If `value` is `undefined`.
 */
export function expectDefined<T>(value: T | undefined, context?: string): T {
  if (value === undefined) {
    const error = new ErrorStack(`Expected value to be defined`);
    if (context) {
      throw new ErrorStack(context, error);
    } else {
      throw error;
    }
  }
  return value;
}

/**
 * Asserts that two values are equal, throwing if they are not.
 * @param a - The first value to compare.
 * @param b - The second value to compare.
 * @param context - Optional additional context to include in the error message.
 * @return `void` if the values are equal.
 * @throws {ErrorStack} If `a` is not equal to `b`.
 */
export function expectEqual<T>(a: T, b: T, context?: string): void {
  if (a !== b) {
    const error = new ErrorStack(`Expected values to be equal`, [a, b]);
    if (context) {
      throw new ErrorStack(context, error);
    } else {
      throw error;
    }
  }
}

/**
 * Returns a promise that resolves after the specified number of milliseconds.
 * @param durationMs - The delay duration in milliseconds.
 * @returns A `Promise<void>` that resolves after the delay.
 */
export function timeoutMs(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

/**
 * Safely retrieves an own (non-inherited) property of an object.
 * @param object - The object to inspect.
 * @param key - The property key to retrieve.
 * @returns The property value if it is an own property, otherwise `undefined`.
 */
export function objectGetOwnProperty<
  Object extends object,
  Key extends keyof Object,
>(object: Object, key: Key): Object[Key & keyof Object] | undefined {
  if (Object.prototype.hasOwnProperty.call(object, key)) {
    return object[key];
  }
  return undefined;
}

/**
 * Resolves the best matching key on an object, trying camelCase and snake_case variants.
 * Returns the first variant that exists as an own property, falling back to the original key.
 * @param object - The object whose keys to search.
 * @param key - The key to look up (string or number).
 * @returns The matching key string found on the object, or the original key if none found.
 */
export function objectGuessIntendedKey(
  object: object,
  key: string | number,
): string {
  if (typeof key === "number") {
    return String(key);
  }
  if (Object.prototype.hasOwnProperty.call(object, key)) {
    return key;
  }
  const keyCamel = casingLosslessConvertToCamel(key);
  if (Object.prototype.hasOwnProperty.call(object, keyCamel)) {
    return keyCamel;
  }
  const keySnake = casingLosslessConvertToSnake(key);
  if (Object.prototype.hasOwnProperty.call(object, keySnake)) {
    return keySnake;
  }
  return key;
}

/**
 * Resolves the best matching key in a `Map`, trying camelCase and snake_case variants.
 * Returns the first variant that exists in the map, falling back to the original key.
 * @param map - The map whose keys to search.
 * @param key - The key to look up.
 * @returns The matching key string found in the map, or the original key if none found.
 */
export function mapGuessIntendedKey<Value>(
  map: Map<string, Value>,
  key: string,
): string {
  if (map.has(key)) {
    return key;
  }
  const keyCamel = casingLosslessConvertToCamel(key);
  if (map.has(keyCamel)) {
    return keyCamel;
  }
  const keySnake = casingLosslessConvertToSnake(key);
  if (map.has(keySnake)) {
    return keySnake;
  }
  return key;
}

/**
 * Compares two byte arrays, ordering first by length and then element-by-element.
 * @param a - The first byte array.
 * @param b - The second byte array.
 * @returns A negative number if `a < b`, positive if `a > b`, or `0` if equal.
 */
export function bytesCompare(a: Uint8Array, b: Uint8Array): number {
  if (a.length !== b.length) {
    return a.length - b.length;
  }
  for (let i = 0; i < a.length; i++) {
    const av = a[i]!;
    const bv = b[i]!;
    if (av !== bv) {
      return av - bv;
    }
  }
  return 0;
}
