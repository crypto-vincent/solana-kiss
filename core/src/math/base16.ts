const alphabet = "0123456789abcdef";

const digitToCode = new Uint8Array(16);
for (let digit = 0; digit < alphabet.length; digit++) {
  digitToCode[digit] = alphabet.charCodeAt(digit)!;
}
const codeToDigit = new Int8Array(256).fill(-1);
for (let digit = 0; digit < alphabet.length; digit++) {
  codeToDigit[alphabet.charCodeAt(digit)!] = digit;
}

const codeDecoder = new TextDecoder();

export function base16Encode(data: Uint8Array): string {
  const codes = new Uint8Array(data.length * 2);
  let codeIndex = 0;
  for (const byte of data) {
    codes[codeIndex++] = digitToCode[byte >> 4]!;
    codes[codeIndex++] = digitToCode[byte & 0x0f]!;
  }
  return codeDecoder.decode(codes);
}

export function base16Decode(message: string): Uint8Array {
  const messageLength = message.length;
  if (messageLength % 2 !== 0) {
    throw new Error(`Base16: decode: invalid message length: ${messageLength}`);
  }
  const bytes = new Uint8Array(messageLength / 2);
  for (let byteIndex = 0; byteIndex < bytes.length; byteIndex++) {
    const codeIndex1 = byteIndex * 2;
    const codeIndex2 = byteIndex * 2 + 1;
    const digit1 = base16DecodeDigit(message, codeIndex1);
    const digit2 = base16DecodeDigit(message, codeIndex2);
    bytes[byteIndex] = (digit1 << 4) | digit2;
  }
  return bytes;
}

function base16DecodeDigit(message: string, codeIndex: number): number {
  const code = message.charCodeAt(codeIndex);
  const digit = codeToDigit[code] ?? -1;
  if (digit < 0) {
    throw new Error(
      `Base16: decode: invalid character "${message[codeIndex]}" at index: ${codeIndex}`,
    );
  }
  return digit;
}
