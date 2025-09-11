// Bitcoin-style Base58 alphabet
const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function base58Encode(data: Uint8Array): string {
  if (data.length === 0) {
    return '';
  }

  // Convert to big integer base 256
  let digits = [0];
  for (let i = 0; i < data.length; i++) {
    let carry = data[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  // Handle leading zeros
  let zeros = 0;
  while (zeros < data.length && data[zeros] === 0) {
    zeros++;
  }

  let result = '';
  for (let i = 0; i < zeros; i++) {
    result += BASE58_ALPHABET[0];
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[digits[i]];
  }

  return result;
}

export function base58Decode(str: string): Uint8Array {
  if (str.length === 0) return new Uint8Array(0);

  let digits = [0];
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    const value = BASE58_ALPHABET.indexOf(c);
    if (value < 0) {
      throw new Error(`Invalid base58 character "${c}" at position ${i}`);
    }

    let carry = value;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] * 58;
      digits[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      digits.push(carry & 0xff);
      carry >>= 8;
    }
  }

  // Handle leading zeros
  let zeros = 0;
  while (zeros < str.length && str[zeros] === BASE58_ALPHABET[0]) {
    zeros++;
  }

  const output = new Uint8Array(zeros + digits.length);
  for (let i = 0; i < digits.length; i++) {
    output[output.length - 1 - i] = digits[i];
  }

  return output;
}
