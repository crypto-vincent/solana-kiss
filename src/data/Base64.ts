import { utf8Decode } from "./Utf8";

const alphabet =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const digitToCode = new Uint8Array(alphabet.length);
for (let digit = 0; digit < alphabet.length; digit++) {
  digitToCode[digit] = alphabet.charCodeAt(digit);
}
const codeToDigit = new Int8Array(127).fill(-1);
for (let digit = 0; digit < alphabet.length; digit++) {
  codeToDigit[alphabet.charCodeAt(digit)] = digit;
}

const codePadding = "=".charCodeAt(0);

/** Encodes a byte array to a Base64 string. */
export function base64Encode(decoded: Uint8Array): string {
  const chunks = decoded.length / 3;
  const codes = new Uint8Array(Math.ceil(chunks) * 4);
  let codeIndex = 0;
  let byteIndex = 0;
  const chunksFloor = Math.floor(chunks);
  for (let chunk = 0; chunk < chunksFloor; chunk++) {
    const byte1 = decoded[byteIndex++]!;
    const byte2 = decoded[byteIndex++]!;
    const byte3 = decoded[byteIndex++]!;
    const digit1 = byte1 >> 2;
    const digit2 = ((byte1 & 0b00000011) << 4) | (byte2 >> 4);
    const digit3 = ((byte2 & 0b00001111) << 2) | (byte3 >> 6);
    const digit4 = byte3 & 0b00111111;
    codes[codeIndex++] = digitToCode[digit1]!;
    codes[codeIndex++] = digitToCode[digit2]!;
    codes[codeIndex++] = digitToCode[digit3]!;
    codes[codeIndex++] = digitToCode[digit4]!;
  }
  if (byteIndex < decoded.length) {
    const byte1 = decoded[byteIndex++]!;
    const digit1 = byte1 >> 2;
    codes[codeIndex++] = digitToCode[digit1]!;
    if (byteIndex < decoded.length) {
      const byte2 = decoded[byteIndex++]!;
      const digit2 = ((byte1 & 0b00000011) << 4) | (byte2 >> 4);
      const digit3 = (byte2 & 0b00001111) << 2;
      codes[codeIndex++] = digitToCode[digit2]!;
      codes[codeIndex++] = digitToCode[digit3]!;
      codes[codeIndex++] = codePadding;
    } else {
      const digit2 = (byte1 & 0b00000011) << 4;
      codes[codeIndex++] = digitToCode[digit2]!;
      codes[codeIndex++] = codePadding;
      codes[codeIndex++] = codePadding;
    }
  }
  return utf8Decode(codes);
}

/** Decodes a Base64 string to a byte array. */
export function base64Decode(encoded: string): Uint8Array {
  const encodedLength = encoded.length;
  if (encodedLength % 4 != 0) {
    throw new Error(`Base64: decode: invalid encoded length: ${encodedLength}`);
  }
  const chunks = encodedLength / 4;
  let bytes: Uint8Array;
  if (encoded.endsWith("==")) {
    bytes = new Uint8Array(chunks * 3 - 2);
  } else if (encoded.endsWith("=")) {
    bytes = new Uint8Array(chunks * 3 - 1);
  } else {
    bytes = new Uint8Array(chunks * 3);
  }
  let byteIndex = 0;
  let codeIndex = 0;
  for (let chunk = 0; chunk < chunks; chunk++) {
    const digit1 = base64DecodeDigit(encoded, codeIndex++);
    const digit2 = base64DecodeDigit(encoded, codeIndex++);
    const byte1 = (digit1 << 2) | (digit2 >> 4);
    bytes[byteIndex++] = byte1;
    if (byteIndex === bytes.length) {
      break;
    }
    const digit3 = base64DecodeDigit(encoded, codeIndex++);
    const byte2 = ((digit2 & 0b00001111) << 4) | (digit3 >> 2);
    bytes[byteIndex++] = byte2;
    if (byteIndex === bytes.length) {
      break;
    }
    const digit4 = base64DecodeDigit(encoded, codeIndex++);
    const byte3 = ((digit3 & 0b00000011) << 6) | digit4;
    bytes[byteIndex++] = byte3;
  }
  return bytes;
}

function base64DecodeDigit(encoded: string, codeIndex: number): number {
  const code = encoded.charCodeAt(codeIndex);
  const digit = codeToDigit[code] ?? -1;
  if (digit < 0) {
    throw new Error(
      `Base64: decode: invalid character "${encoded[codeIndex]}" at index: ${codeIndex}`,
    );
  }
  return digit;
}
