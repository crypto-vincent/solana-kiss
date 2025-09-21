const alphabet =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const digitToCode = new Uint8Array(alphabet.length);
for (let digit = 0; digit < alphabet.length; digit++) {
  digitToCode[digit] = alphabet.charCodeAt(digit)!;
}
const codeToDigit = new Int8Array(127).fill(-1);
for (let digit = 0; digit < alphabet.length; digit++) {
  codeToDigit[alphabet.charCodeAt(digit)!] = digit;
}

const codePadding = "=".charCodeAt(0);
const codeDecoder = new TextDecoder();

export function base64Encode(bytes: Uint8Array): string {
  const chunks = bytes.length / 3;
  const codes = new Uint8Array(Math.ceil(chunks) * 4);
  let codeIndex = 0;
  let byteIndex = 0;
  const chunksFloor = Math.floor(chunks);
  for (let chunk = 0; chunk < chunksFloor; chunk++) {
    const byte1 = bytes[byteIndex++]!;
    const byte2 = bytes[byteIndex++]!;
    const byte3 = bytes[byteIndex++]!;
    const digit1 = byte1 >> 2;
    const digit2 = ((byte1 & 0b00000011) << 4) | (byte2 >> 4);
    const digit3 = ((byte2 & 0b00001111) << 2) | (byte3 >> 6);
    const digit4 = byte3 & 0b00111111;
    codes[codeIndex++] = digitToCode[digit1]!;
    codes[codeIndex++] = digitToCode[digit2]!;
    codes[codeIndex++] = digitToCode[digit3]!;
    codes[codeIndex++] = digitToCode[digit4]!;
  }
  if (byteIndex < bytes.length) {
    const byte1 = bytes[byteIndex++]!;
    const digit1 = byte1 >> 2;
    codes[codeIndex++] = digitToCode[digit1]!;
    if (byteIndex < bytes.length) {
      const byte2 = bytes[byteIndex++]!;
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
  return codeDecoder.decode(codes);
}

export function base64Decode(message: string): Uint8Array {
  const messageLength = message.length;
  if (messageLength % 4 != 0) {
    throw new Error(`Base64: decode: invalid message length: ${messageLength}`);
  }
  const chunks = messageLength / 4;
  let bytes: Uint8Array;
  if (message.endsWith("==")) {
    bytes = new Uint8Array(chunks * 3 - 2);
  } else if (message.endsWith("=")) {
    bytes = new Uint8Array(chunks * 3 - 1);
  } else {
    bytes = new Uint8Array(chunks * 3);
  }
  let byteIndex = 0;
  let codeIndex = 0;
  for (let chunk = 0; chunk < chunks; chunk++) {
    const digit1 = base64DecodeDigit(message, codeIndex++);
    const digit2 = base64DecodeDigit(message, codeIndex++);
    const byte1 = (digit1 << 2) | (digit2 >> 4);
    bytes[byteIndex++] = byte1;
    if (byteIndex == bytes.length) {
      break;
    }
    const digit3 = base64DecodeDigit(message, codeIndex++);
    const byte2 = ((digit2 & 0b00001111) << 4) | (digit3 >> 2);
    bytes[byteIndex++] = byte2;
    if (byteIndex == bytes.length) {
      break;
    }
    const digit4 = base64DecodeDigit(message, codeIndex++);
    const byte3 = ((digit3 & 0b00000011) << 6) | digit4;
    bytes[byteIndex++] = byte3;
  }
  return bytes;
}

function base64DecodeDigit(message: string, codeIndex: number): number {
  const code = message.charCodeAt(codeIndex);
  const digit = codeToDigit[code] ?? -1;
  if (digit < 0) {
    throw new Error(
      `Base64: decode: invalid character "${message[codeIndex]}" at index: ${codeIndex}`,
    );
  }
  return digit;
}
