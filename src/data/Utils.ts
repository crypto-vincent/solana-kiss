import {
  casingLosslessConvertToCamel,
  casingLosslessConvertToSnake,
} from "./Casing";
import { ErrorStack } from "./Error";

/** Exactly-one-key variant of object `T`. Useful for discriminated unions without a discriminant field. */
export type OneKeyOf<T extends Record<string, any>> = {
  [K in keyof T]: { [P in K]: T[P] } & { [Q in Exclude<keyof T, K>]?: never };
}[keyof T];

/** Either a successful value or an error (exactly one of `value` or `error` is present). */
export type Result<Value, Error = any> = OneKeyOf<{
  value: Value;
  error: Error;
}>;

/** Nominal (branded) type to prevent accidental mixing of same-underlying-type values. */
export type Branded<T, Name> =
  | (T & { readonly __unique: symbol })
  | { readonly __brand: Name };

/**
 * Asserts a value is defined, throwing if it is `undefined`.
 * @param value - Value to check.
 * @param context - Optional error context.
 * @returns Value narrowed to exclude `undefined`.
 * @throws {@link ErrorStack} if `undefined`.
 */
export function expectDefined<T>(value: T | undefined, context?: string): T {
  if (value === undefined) {
    const error = new ErrorStack(`Value is undefined`);
    if (context) {
      throw new ErrorStack(context, error);
    } else {
      throw error;
    }
  }
  return value;
}

/**
 * Asserts two values are equal, throwing if not.
 * @param a - First value.
 * @param b - Second value.
 * @param context - Optional error context.
 * @throws {@link ErrorStack} if `a !== b`.
 */
export function expectEqual<T>(a: T, b: T, context?: string): void {
  if (a !== b) {
    const error = new ErrorStack(`Values are not equal`, [a, b]);
    if (context) {
      throw new ErrorStack(context, error);
    } else {
      throw error;
    }
  }
}

/**
 * Returns a promise that resolves after `durationMs` milliseconds.
 * @param durationMs - Delay in milliseconds.
 * @returns `Promise<void>`.
 */
export function timeoutMs(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

/**
 * Returns an own (non-inherited) property of an object, or `undefined`.
 * @param object - Object to inspect.
 * @param key - Property key.
 * @returns Property value if own, otherwise `undefined`.
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
 * Finds the best matching key on an object, trying camelCase and snake_case variants.
 * @param object - Object whose keys to search.
 * @param key - Key to look up.
 * @returns Matching key found, or original key as fallback.
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
 * Finds the best matching key in a `Map`, trying camelCase and snake_case variants.
 * @param map - Map whose keys to search.
 * @param key - Key to look up.
 * @returns Matching key found, or original key as fallback.
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
 * Compares two byte arrays: first by length, then element-by-element.
 * @param a - First byte array.
 * @param b - Second byte array.
 * @returns Negative if `a < b`, positive if `a > b`, `0` if equal.
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
