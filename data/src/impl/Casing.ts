export type CasingCamelToSnake<S extends string> =
  S extends `${infer T}${infer U}`
    ? U extends Uncapitalize<U>
      ? `${Lowercase<T>}${CasingCamelToSnake<U>}`
      : `${Lowercase<T>}_${CasingCamelToSnake<U>}`
    : S;
export function casingCamelToSnake(camelCase: string): string {
  return camelCase.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}
export function casingKeyedCamelToSnake<T extends object>(
  object: T,
): {
  [K in keyof T as K extends string
    ? Uncapitalize<CasingCamelToSnake<K>>
    : K]: T[K];
} {
  const result: any = {};
  for (const key in object) {
    result[casingCamelToSnake(key)] = object[key];
  }
  return result;
}

export type CasingSnakeToCamel<S extends string> =
  S extends `${infer T}_${infer U}`
    ? `${T}${Capitalize<CasingSnakeToCamel<U>>}`
    : S;
export function casingSnakeToCamel(snakeCase: string): string {
  return snakeCase.replace(/_([a-z0-9])/g, (_match, group1) =>
    group1.toUpperCase(),
  );
}
export function casingKeyedSnakeToCamel<T extends object>(
  object: T,
): { [K in keyof T as K extends string ? CasingSnakeToCamel<K> : K]: T[K] } {
  const result: any = {};
  for (const key in object) {
    result[casingSnakeToCamel(key)] = object[key];
  }
  return result;
}
