const alphabet =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const lookupTable: number[] = new Array(256).fill(-1);
for (let i = 0; i < alphabet.length; i++) {
  lookupTable[alphabet.charCodeAt(i)] = i;
}

export function base64Encode(data: Uint8Array): string {
  let result = '';
  let index: number;
  for (index = 0; index + 2 < data.length; index += 3) {
    const byte1 = data[index];
    const byte2 = data[index + 1];
    const byte3 = data[index + 2];
    result +=
      alphabet[byte1 >> 2] +
      alphabet[((byte1 & 0x03) << 4) | (byte2 >> 4)] +
      alphabet[((byte2 & 0x0f) << 2) | (byte3 >> 6)] +
      alphabet[byte3 & 0x3f];
  }
  if (index < data.length) {
    const byte1 = data[index];
    result += alphabet[byte1 >> 2];
    if (index + 1 < data.length) {
      const byte2 = data[index + 1];
      result += alphabet[((byte1 & 0x03) << 4) | (byte2 >> 4)];
      result += alphabet[(byte2 & 0x0f) << 2];
      result += '=';
    } else {
      result += alphabet[(byte1 & 0x03) << 4];
      result += '==';
    }
  }
  return result;
}

export function base64Decode(base64: string): Uint8Array {
  // Remove padding
  let str = base64.replace(/=+$/, '');
  const len = str.length;

  if (len % 4 === 1) {
    throw new Error('Invalid Base64 string');
  }

  const bytes: number[] = [];
  let i: number;

  for (i = 0; i < len; i += 4) {
    const c1 = lookupTable[str.charCodeAt(i)];
    const c2 = lookupTable[str.charCodeAt(i + 1)];
    const c3 = i + 2 < len ? lookupTable[str.charCodeAt(i + 2)] : 0;
    const c4 = i + 3 < len ? lookupTable[str.charCodeAt(i + 3)] : 0;

    if (c1 < 0 || c2 < 0 || c3 < 0 || c4 < 0) {
      throw new Error(`Invalid character in Base64 string at position ${i}`);
    }

    bytes.push((c1 << 2) | (c2 >> 4));

    if (i + 2 < len && str[i + 2] !== '=') {
      bytes.push(((c2 & 15) << 4) | (c3 >> 2));
    }

    if (i + 3 < len && str[i + 3] !== '=') {
      bytes.push(((c3 & 3) << 6) | c4);
    }
  }

  return new Uint8Array(bytes);
}
