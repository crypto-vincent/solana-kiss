// TODO - optimize performance for this

export function casingConvertToSnake(string: string): string {
  return string
    .replace(/[_\-\s]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function casingConvertToCamel(string: string): string {
  return string
    .replace(/[_\-\s]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .toLowerCase()
    .replace(/\s([a-z])/g, (_, char) => char.toUpperCase())
    .replace(/\s+/g, "");
}
