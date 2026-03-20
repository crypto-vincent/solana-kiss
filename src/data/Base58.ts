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
const cacheDigits = new Array<number>();

/**
 * Encodes a byte array as a Base58 string.
 * @param bytes - The bytes to encode.
 * @returns The Base58 encoded string, or an empty string for empty input.
 */
export function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) {
    return "";
  }
  cacheDigits.length = 0;
  for (let byteIndex = 0; byteIndex < bytes.length; byteIndex++) {
    let carry = bytes[byteIndex]!;
    for (let digitIndex = 0; digitIndex < cacheDigits.length; digitIndex++) {
      carry += cacheDigits[digitIndex]! << 8;
      cacheDigits[digitIndex] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      cacheDigits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) {
    zeros++;
  }
  const codes = new Uint8Array(zeros + cacheDigits.length);
  let codeIndex = 0;
  for (let counter = 0; counter < zeros; counter++) {
    codes[codeIndex++] = codePadding;
  }
  for (let digitIndex = cacheDigits.length - 1; digitIndex >= 0; digitIndex--) {
    codes[codeIndex++] = digitToCode[cacheDigits[digitIndex]!]!;
  }
  return utf8Decode(codes);
}

/**
 * Decodes a Base58 string into a byte array.
 * @param base58 - The Base58 string to decode.
 * @returns The decoded bytes, or an empty array for empty input.
 * @throws {Error} If the string contains characters outside the Base58 alphabet.
 */
export function base58Decode(base58: string): Uint8Array {
  const encodedLength = base58.length;
  if (encodedLength === 0) {
    return new Uint8Array(0);
  }
  cacheDigits.length = 0;
  for (let codeIndex = 0; codeIndex < encodedLength; codeIndex++) {
    let carry = base58DecodeDigit(base58, codeIndex);
    for (let digitIndex = 0; digitIndex < cacheDigits.length; digitIndex++) {
      carry += cacheDigits[digitIndex]! * 58;
      cacheDigits[digitIndex] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      cacheDigits.push(carry & 0xff);
      carry >>= 8;
    }
  }
  let zeros = 0;
  while (zeros < encodedLength && base58.charCodeAt(zeros) === codePadding) {
    zeros++;
  }
  const bytes = new Uint8Array(zeros + cacheDigits.length);
  for (let digitIndex = 0; digitIndex < cacheDigits.length; digitIndex++) {
    bytes[bytes.length - 1 - digitIndex] = cacheDigits[digitIndex]!;
  }
  return bytes;
}

/**
 * Calculates the byte length of a Base58 encoded string
 * @param base58 - The Base58 encoded string.
 * @returns The byte length of the decoded byte array.
 */
export function base58BytesLength(base58: string): number {
  const encodedLength = base58.length;
  if (encodedLength === 0) {
    return 0;
  }
  cacheDigits.length = 0;
  for (let codeIndex = 0; codeIndex < encodedLength; codeIndex++) {
    let carry = base58DecodeDigit(base58, codeIndex);
    for (let digitIndex = 0; digitIndex < cacheDigits.length; digitIndex++) {
      carry += cacheDigits[digitIndex]! * 58;
      cacheDigits[digitIndex] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      cacheDigits.push(carry & 0xff);
      carry >>= 8;
    }
  }
  let zeros = 0;
  while (zeros < encodedLength && base58.charCodeAt(zeros) === codePadding) {
    zeros++;
  }
  return zeros + cacheDigits.length;
}

function base58DecodeDigit(base58: string, codeIndex: number): number {
  const code = base58.charCodeAt(codeIndex);
  const digit = codeToDigit[code] ?? -1;
  if (digit < 0) {
    throw new Error(
      `Base58: decode: invalid character "${base58[codeIndex]}" at index: ${codeIndex}`,
    );
  }
  return digit;
}
