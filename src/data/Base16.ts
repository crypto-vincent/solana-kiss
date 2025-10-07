import { utf8Decode } from "./Utf8";

const alphabetLower = "0123456789abcdef";
const alphabetUpper = "0123456789ABCDEF";

const digitToCode = new Uint8Array(16);
for (let digit = 0; digit < alphabetUpper.length; digit++) {
  digitToCode[digit] = alphabetUpper.charCodeAt(digit)!;
}
const codeToDigit = new Int8Array(256).fill(-1);
for (let digit = 0; digit < alphabetLower.length; digit++) {
  codeToDigit[alphabetLower.charCodeAt(digit)!] = digit;
}
for (let digit = 0; digit < alphabetUpper.length; digit++) {
  codeToDigit[alphabetUpper.charCodeAt(digit)!] = digit;
}

export function base16Encode(decoded: Uint8Array): string {
  const codes = new Uint8Array(decoded.length * 2);
  let codeIndex = 0;
  for (const byte of decoded) {
    codes[codeIndex++] = digitToCode[byte >> 4]!;
    codes[codeIndex++] = digitToCode[byte & 0x0f]!;
  }
  return utf8Decode(codes);
}

export function base16Decode(encoded: string): Uint8Array {
  const encodedLength = encoded.length;
  if (encodedLength % 2 !== 0) {
    throw new Error(`Base16: decode: invalid encoded length: ${encodedLength}`);
  }
  const decoded = new Uint8Array(encodedLength / 2);
  for (let byteIndex = 0; byteIndex < decoded.length; byteIndex++) {
    const codeIndex1 = byteIndex * 2;
    const codeIndex2 = byteIndex * 2 + 1;
    const digit1 = base16DecodeDigit(encoded, codeIndex1);
    const digit2 = base16DecodeDigit(encoded, codeIndex2);
    decoded[byteIndex] = (digit1 << 4) | digit2;
  }
  return decoded;
}

function base16DecodeDigit(encoded: string, codeIndex: number): number {
  const code = encoded.charCodeAt(codeIndex);
  const digit = codeToDigit[code] ?? -1;
  if (digit < 0) {
    throw new Error(
      `Base16: decode: invalid character "${encoded[codeIndex]}" at index: ${codeIndex}`,
    );
  }
  return digit;
}
