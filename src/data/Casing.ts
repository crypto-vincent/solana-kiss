export function casingLosslessConvertToSnake(string: string): string {
  const codes = new Array<number>();
  for (let index = 0; index < string.length; index++) {
    const code = string.charCodeAt(index)!;
    if (codeIsUppercase(code)) {
      codes.push(codeUnderscore);
      codes.push(code + codeUpperToLower);
    } else {
      codes.push(code);
    }
  }
  return String.fromCharCode(...codes);
}

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

const codeUnderscore = "_".charCodeAt(0)!;
const codeUpperToLower = "a".charCodeAt(0)! - "A".charCodeAt(0)!;

function codeIsLowercase(code: number): boolean {
  return code >= 97 && code <= 122;
}

function codeIsUppercase(code: number): boolean {
  return code >= 65 && code <= 90;
}
