export function withContext<T>(message: string, fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    throw new Error(
      `${message}\n > ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export type Immutable<T> = T extends
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Date
  | RegExp
  | Error
  ? T
  : T extends (...args: any[]) => any
    ? T
    : T extends ReadonlyMap<infer K, infer V>
      ? ReadonlyMap<Immutable<K>, Immutable<V>>
      : T extends Map<infer K, infer V>
        ? ReadonlyMap<Immutable<K>, Immutable<V>>
        : T extends ReadonlySet<infer U>
          ? ReadonlySet<Immutable<U>>
          : T extends Set<infer U>
            ? ReadonlySet<Immutable<U>>
            : T extends WeakMap<infer K, infer V>
              ? WeakMap<Immutable<K>, Immutable<V>>
              : T extends WeakSet<infer U>
                ? WeakSet<Immutable<U>>
                : T extends Promise<infer U>
                  ? Promise<Immutable<U>>
                  : T extends readonly []
                    ? T
                    : T extends readonly [infer _H, ...infer _R]
                      ? { readonly [I in keyof T]: Immutable<T[I]> }
                      : T extends ReadonlyArray<infer U>
                        ? ReadonlyArray<Immutable<U>>
                        : T extends Array<infer U>
                          ? ReadonlyArray<Immutable<U>>
                          : T extends object
                            ? { readonly [P in keyof T]: Immutable<T[P]> }
                            : T;
