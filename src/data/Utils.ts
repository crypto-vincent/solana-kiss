import { casingConvertToCamel, casingConvertToSnake } from "./Casing";

export type NotNull<T> = T extends null | undefined ? never : T;

export type Result<Value, Error = any> = { value?: Value; error?: Error };

export type BrandedType<T, Name> =
  | (T & { readonly __brand: Name })
  | { readonly __brand: Name };

export function expectDefined<T>(value: T | undefined, name?: string): T {
  if (value === undefined) {
    throw new Error(`Expected ${name ?? "value"} to be defined`);
  }
  return value;
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
  if (key.includes("_")) {
    const keyCamel = casingConvertToCamel(key);
    if (Object.prototype.hasOwnProperty.call(object, keyCamel)) {
      return keyCamel as Key;
    }
  } else {
    const keySnake = casingConvertToSnake(key);
    if (Object.prototype.hasOwnProperty.call(object, keySnake)) {
      return keySnake as Key;
    }
  }
  return key;
}

export function withErrorContext<T>(message: string, fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    throw new ErrorWithContext(message, error);
  }
}

export function timeoutMs(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

export class ErrorWithContext extends Error {
  constructor(message: string, error: any) {
    super(
      `${message}\n > ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// TODO (error) - error stacking util (for what except the find account loop ?)
