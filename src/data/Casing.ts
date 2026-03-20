const codeLowerA = "a".charCodeAt(0);
const codeLowerZ = "z".charCodeAt(0);
const codeUpperA = "A".charCodeAt(0);
const codeUpperZ = "Z".charCodeAt(0);
const codeUnderscore = "_".charCodeAt(0);
const codeUpperToLower = codeLowerA - codeUpperA;

const cacheCodes = new Array<number>();

/**
 * Converts a camelCase string to snake_case without data loss (losslessly reversible).
 * Each uppercase letter is replaced with an underscore followed by its lowercase equivalent.
 * @param string - The camelCase string to convert.
 * @returns The snake_case equivalent string.
 */
export function casingLosslessConvertToSnake(string: string): string {
  cacheCodes.length = 0;
  for (let index = 0; index < string.length; index++) {
    const code = string.charCodeAt(index);
    if (code >= codeUpperA && code <= codeUpperZ) {
      cacheCodes.push(codeUnderscore);
      cacheCodes.push(code + codeUpperToLower);
    } else {
      cacheCodes.push(code);
    }
  }
  return String.fromCharCode(...cacheCodes);
}

/**
 * Converts a snake_case string to camelCase without data loss (losslessly reversible).
 * Each underscore followed by a lowercase letter is replaced with the uppercase letter.
 * @param string - The snake_case string to convert.
 * @returns The camelCase equivalent string.
 */
export function casingLosslessConvertToCamel(string: string): string {
  cacheCodes.length = 0;
  for (let index = 0; index < string.length; index++) {
    const code = string.charCodeAt(index);
    if (
      code >= codeLowerA &&
      code <= codeLowerZ &&
      string.charCodeAt(index - 1) === codeUnderscore
    ) {
      cacheCodes[cacheCodes.length - 1] = code - codeUpperToLower;
    } else {
      cacheCodes.push(code);
    }
  }
  return String.fromCharCode(...cacheCodes);
}
