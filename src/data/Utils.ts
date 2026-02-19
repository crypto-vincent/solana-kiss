import {
  casingLosslessConvertToCamel,
  casingLosslessConvertToSnake,
} from "./Casing";

export type OneKeyOf<T extends Record<string, any>> = {
  [K in keyof T]: { [P in K]: T[P] } & { [Q in Exclude<keyof T, K>]?: never };
}[keyof T];

export type Result<Value, Error = any> = OneKeyOf<{
  value: Value;
  error: Error;
}>;

export type Branded<T, Name> =
  | (T & { readonly __unique: symbol })
  | { readonly __brand: Name };

/** Asserts a value is defined, throwing if it is undefined. */
export function expectDefined<T>(value: T | undefined, name?: string): T {
  if (value === undefined) {
    throw new Error(`Expected ${name ?? "value"} to be defined`);
  }
  return value;
}

/** Returns a promise that resolves after the given milliseconds. */
export function timeoutMs(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

/** Returns an own property value, or undefined if not owned. */
export function objectGetOwnProperty<
  Object extends object,
  Key extends keyof Object,
>(object: Object, key: Key): Object[Key & keyof Object] | undefined {
  if (Object.prototype.hasOwnProperty.call(object, key)) {
    return object[key];
  }
  return undefined;
}

/** Finds the intended key in an object, trying camel/snake_case. */
export function objectGuessIntendedKey<
  Object extends object,
  Key extends keyof Object,
>(object: Object, key: Key): Key {
  if (typeof key !== "string") {
    return key;
  }
  if (Object.prototype.hasOwnProperty.call(object, key)) {
    return key;
  }
  const keyCamel = casingLosslessConvertToCamel(key);
  if (Object.prototype.hasOwnProperty.call(object, keyCamel)) {
    return keyCamel as Key;
  }
  const keySnake = casingLosslessConvertToSnake(key);
  if (Object.prototype.hasOwnProperty.call(object, keySnake)) {
    return keySnake as Key;
  }
  return key;
}

/** Finds the intended key in a Map, trying camel/snake_case. */
export function mapGuessIntendedKey<Key, Value>(
  map: Map<Key, Value>,
  key: Key,
): Key {
  if (typeof key !== "string") {
    return key;
  }
  if (map.has(key)) {
    return key;
  }
  const keyCamel = casingLosslessConvertToCamel(key) as Key;
  if (map.has(keyCamel)) {
    return keyCamel;
  }
  const keySnake = casingLosslessConvertToSnake(key) as Key;
  if (map.has(keySnake)) {
    return keySnake;
  }
  return key;
}
