export function casingConvertToSnake(camelCase: string): string {
  return camelCase.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

export function casingConvertToCamel(string: string): string {
  const base = string.replace(/[_-]+([a-z0-9])/g, (_, first) =>
    first.toUpperCase(),
  );
  return base.charAt(0).toLowerCase() + base.slice(1);
}

export function casingConvertToPascal(string: string): string {
  const base = string.replace(/[_-]+([a-z0-9])/g, (_, first) =>
    first.toUpperCase(),
  );
  return base.charAt(0).toUpperCase() + base.slice(1);
}
