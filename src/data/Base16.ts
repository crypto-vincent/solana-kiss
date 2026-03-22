import { utf8Decode } from "./Utf8";

const alphabetLower = "0123456789abcdef";
const alphabetUpper = "0123456789ABCDEF";

const digitToCode = new Uint8Array(16);
for (let digit = 0; digit < alphabetLower.length; digit++) {
  digitToCode[digit] = alphabetLower.charCodeAt(digit);
}
const codeToDigit = new Int8Array(256).fill(-1);
for (let digit = 0; digit < alphabetLower.length; digit++) {
  codeToDigit[alphabetLower.charCodeAt(digit)] = digit;
}
for (let digit = 0; digit < alphabetUpper.length; digit++) {
  codeToDigit[alphabetUpper.charCodeAt(digit)] = digit;
}

/**
 * Encodes a byte array as a lowercase hexadecimal string.
 * @param bytes - The bytes to encode.
 * @returns The Base16 (hex) encoded string.
 */
export function base16Encode(bytes: Uint8Array): string {
  const codes = new Uint8Array(bytes.length * 2);
  let codeIndex = 0;
  for (let byteIndex = 0; byteIndex < bytes.length; byteIndex++) {
    const byte = bytes[byteIndex]!;
    codes[codeIndex++] = digitToCode[byte >> 4]!;
    codes[codeIndex++] = digitToCode[byte & 0x0f]!;
  }
  return utf8Decode(codes);
}

/**
 * Decodes a Base16 (hex) string into a byte array.
 * @param base16 - The hex string to decode (case-insensitive).
 * @returns The decoded bytes.
 * @throws {Error} If the string length is odd or contains non-hex characters.
 */
export function base16Decode(base16: string): Uint8Array {
  const encodedLength = base16.length;
  if (encodedLength % 2 !== 0) {
    throw new Error(`Base16: decode: invalid encoded length: ${encodedLength}`);
  }
  const decoded = new Uint8Array(encodedLength / 2);
  for (let byteIndex = 0; byteIndex < decoded.length; byteIndex++) {
    const codeIndex1 = byteIndex * 2;
    const codeIndex2 = byteIndex * 2 + 1;
    const digit1 = base16DecodeDigit(base16, codeIndex1);
    const digit2 = base16DecodeDigit(base16, codeIndex2);
    decoded[byteIndex] = (digit1 << 4) | digit2;
  }
  return decoded;
}

function base16DecodeDigit(base16: string, codeIndex: number): number {
  const code = base16.charCodeAt(codeIndex);
  const digit = codeToDigit[code] ?? -1;
  if (digit < 0) {
    throw new Error(
      `Base16: decode: invalid character "${base16[codeIndex]}" at index: ${codeIndex}`,
    );
  }
  return digit;
}
