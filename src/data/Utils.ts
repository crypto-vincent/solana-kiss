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
  | (T & { readonly __brand: Name })
  | { readonly __brand: Name };

export function expectDefined<T>(value: T | undefined, name?: string): T {
  if (value === undefined) {
    throw new Error(`Expected ${name ?? "value"} to be defined`);
  }
  return value;
}

export function timeoutMs(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

export function objectGetOwnProperty<
  Object extends object,
  Key extends keyof Object,
>(
  object: Object | undefined,
  key: Key,
): Object[Key & keyof Object] | undefined {
  if (object === undefined) {
    return undefined;
  }
  if (Object.prototype.hasOwnProperty.call(object, key)) {
    return object[key];
  }
  return undefined;
}

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
