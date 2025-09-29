export function camelCaseToSnakeCase(camelCase: string): string {
  return camelCase.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}
