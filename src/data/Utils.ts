export type Branded<T, Name> =
  | (T & { readonly __brand: Name })
  | { readonly __brand: Name };

export function withErrorContext<T>(message: string, fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    throw new Error(
      `${message}\n > ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

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

// TODO - error stacking util (for what except the find account loop ?)
