export function withContext<T>(message: string, fn: () => T): T {
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
    throw new Error(
      `Expected ${name ?? "value"} to be valid (but found undefined)`,
    );
  }
  return value;
}

export function objectGetOwnProperty<
  Object extends object,
  Key extends keyof Object,
>(object: Object, key: Key): Object[Key & keyof Object] | undefined {
  if (Object.prototype.hasOwnProperty.call(object, key)) {
    if (key in object) {
      return object[key];
    }
  }
  return undefined;
}

// TODO - error stacking util (for what except the find account loop ?)
