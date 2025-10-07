export function casingCamelToSnake(camelCase: string): string {
  return camelCase.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

export function casingSnakeToCamel(snakeCase: string): string {
  return snakeCase.replace(/_([a-z0-9])/g, (_match, group1) =>
    group1.toUpperCase(),
  );
}
