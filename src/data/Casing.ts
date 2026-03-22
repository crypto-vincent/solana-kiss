const codeLowerA = "a".charCodeAt(0);
const codeLowerZ = "z".charCodeAt(0);
const codeUpperA = "A".charCodeAt(0);
const codeUpperZ = "Z".charCodeAt(0);
const codeUnderscore = "_".charCodeAt(0);
const codeUpperToLower = codeLowerA - codeUpperA;

const cacheCodes = new Array<number>();

/**
 * Converts camelCase to snake_case (losslessly reversible).
 * @param string - camelCase input.
 * @returns snake_case result.
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
 * Converts snake_case to camelCase (losslessly reversible).
 * @param string - snake_case input.
 * @returns camelCase result.
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
