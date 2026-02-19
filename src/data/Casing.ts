/**
 * Converts a camelCase string to snake_case without data loss (losslessly reversible).
 * Each uppercase letter is replaced with an underscore followed by its lowercase equivalent.
 * @param string - The camelCase string to convert.
 * @returns The snake_case equivalent string.
 */
export function casingLosslessConvertToSnake(string: string): string {
  const codes = new Array<number>();
  for (let index = 0; index < string.length; index++) {
    const code = string.charCodeAt(index);
    if (codeIsUppercase(code)) {
      codes.push(codeUnderscore);
      codes.push(code + codeUpperToLower);
    } else {
      codes.push(code);
    }
  }
  return String.fromCharCode(...codes);
}

/**
 * Converts a snake_case string to camelCase without data loss (losslessly reversible).
 * Each underscore followed by a lowercase letter is replaced with the uppercase letter.
 * @param string - The snake_case string to convert.
 * @returns The camelCase equivalent string.
 */
export function casingLosslessConvertToCamel(string: string): string {
  const codes = new Array<number>();
  for (let index = 0; index < string.length; index++) {
    const code = string.charCodeAt(index);
    if (
      codeIsLowercase(code) &&
      string.charCodeAt(index - 1) === codeUnderscore
    ) {
      codes[codes.length - 1] = code - codeUpperToLower;
    } else {
      codes.push(code);
    }
  }
  return String.fromCharCode(...codes);
}

const codeLowerA = "a".charCodeAt(0);
const codeLowerZ = "z".charCodeAt(0);
const codeUpperA = "A".charCodeAt(0);
const codeUpperZ = "Z".charCodeAt(0);
const codeUnderscore = "_".charCodeAt(0);
const codeUpperToLower = codeLowerA - codeUpperA;

function codeIsLowercase(code: number): boolean {
  return code >= codeLowerA && code <= codeLowerZ;
}

function codeIsUppercase(code: number): boolean {
  return code >= codeUpperA && code <= codeUpperZ;
}
