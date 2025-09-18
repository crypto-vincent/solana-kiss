const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const digitToCode = new Uint8Array(alphabet.length);
for (let digit = 0; digit < alphabet.length; digit++) {
  digitToCode[digit] = alphabet.charCodeAt(digit)!;
}
const codeToDigit = new Int8Array(127).fill(-1);
for (let digit = 0; digit < alphabet.length; digit++) {
  codeToDigit[alphabet.charCodeAt(digit)!] = digit;
}

const codePadding = '1'.charCodeAt(0);
const codeDecoder = new TextDecoder();

export function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) {
    return '';
  }
  const digits = new Array<number>();
  for (let byte of bytes) {
    let carry = byte;
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
  while (zeros < bytes.length && bytes[zeros] === 0) {
    zeros++;
  }
  const codes = new Uint8Array(zeros + digits.length);
  let codeIndex = 0;
  for (let i = 0; i < zeros; i++) {
    codes[codeIndex++] = codePadding;
  }
  for (let digitIndex = digits.length - 1; digitIndex >= 0; digitIndex--) {
    codes[codeIndex++] = digitToCode[digits[digitIndex]!]!;
  }
  return codeDecoder.decode(codes);
}

export function base58Decode(message: string): Uint8Array {
  if (message.length === 0) {
    return new Uint8Array(0);
  }
  const digits = new Array<number>();
  for (let codeIndex = 0; codeIndex < message.length; codeIndex++) {
    const code = message.charCodeAt(codeIndex)!;
    const digit = codeToDigit[code] ?? -1;
    if (digit < 0) {
      throw new Error(
        `Base58: decode: invalid character "${message[codeIndex]}" at index: ${codeIndex}`,
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
  while (zeros < message.length && message.charCodeAt(zeros) === codePadding) {
    zeros++;
  }
  const bytes = new Uint8Array(zeros + digits.length);
  for (let digitIndex = 0; digitIndex < digits.length; digitIndex++) {
    bytes[bytes.length - 1 - digitIndex] = digits[digitIndex]!;
  }
  return bytes;
}
