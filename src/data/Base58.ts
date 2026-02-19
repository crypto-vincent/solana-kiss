import { utf8Decode } from "./Utf8";

const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const digitToCode = new Uint8Array(alphabet.length);
for (let digit = 0; digit < alphabet.length; digit++) {
  digitToCode[digit] = alphabet.charCodeAt(digit);
}
const codeToDigit = new Int8Array(127).fill(-1);
for (let digit = 0; digit < alphabet.length; digit++) {
  codeToDigit[alphabet.charCodeAt(digit)] = digit;
}

const codePadding = "1".charCodeAt(0);

/**
 * Encodes a byte array as a Base58 string.
 * @param decoded - The bytes to encode.
 * @returns The Base58 encoded string, or an empty string for empty input.
 */
export function base58Encode(decoded: Uint8Array): string {
  if (decoded.length === 0) {
    return "";
  }
  const digits = new Array<number>();
  for (let byteIndex = 0; byteIndex < decoded.length; byteIndex++) {
    let carry = decoded[byteIndex]!;
    for (let digitIndex = 0; digitIndex < digits.length; digitIndex++) {
      carry += digits[digitIndex]! << 8;
      digits[digitIndex] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let zeros = 0;
  while (zeros < decoded.length && decoded[zeros] === 0) {
    zeros++;
  }
  const codes = new Uint8Array(zeros + digits.length);
  let codeIndex = 0;
  for (let counter = 0; counter < zeros; counter++) {
    codes[codeIndex++] = codePadding;
  }
  for (let digitIndex = digits.length - 1; digitIndex >= 0; digitIndex--) {
    codes[codeIndex++] = digitToCode[digits[digitIndex]!]!;
  }
  return utf8Decode(codes);
}

/**
 * Decodes a Base58 string into a byte array.
 * @param encoded - The Base58 string to decode.
 * @returns The decoded bytes, or an empty array for empty input.
 * @throws {Error} If the string contains characters outside the Base58 alphabet.
 */
export function base58Decode(encoded: string): Uint8Array {
  const encodedLength = encoded.length;
  if (encodedLength === 0) {
    return new Uint8Array(0);
  }
  const digits = new Array<number>();
  for (let codeIndex = 0; codeIndex < encodedLength; codeIndex++) {
    const code = encoded.charCodeAt(codeIndex);
    const digit = codeToDigit[code] ?? -1;
    if (digit < 0) {
      throw new Error(
        `Base58: decode: invalid character "${encoded[codeIndex]}" at index: ${codeIndex}`,
      );
    }
    let carry = digit;
    for (let digitIndex = 0; digitIndex < digits.length; digitIndex++) {
      carry += digits[digitIndex]! * 58;
      digits[digitIndex] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      digits.push(carry & 0xff);
      carry >>= 8;
    }
  }
  let zeros = 0;
  while (zeros < encodedLength && encoded.charCodeAt(zeros) === codePadding) {
    zeros++;
  }
  const bytes = new Uint8Array(zeros + digits.length);
  for (let digitIndex = 0; digitIndex < digits.length; digitIndex++) {
    bytes[bytes.length - 1 - digitIndex] = digits[digitIndex]!;
  }
  return bytes;
}
