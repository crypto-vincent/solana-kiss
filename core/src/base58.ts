const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// TODO - optimize this

export function base58Encode(input: Uint8Array): string {
  if (input.length === 0) {
    return '';
  }
  const digits = [0];
  for (let i = 0; i < input.length; i++) {
    let carry = input[i];
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
  let zeros = 0;
  while (zeros < input.length && input[zeros] === 0) {
    zeros++;
  }
  const output: string[] = [];
  for (let i = 0; i < zeros; i++) {
    output.push(alphabet.charAt(0));
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    output.push(alphabet.charAt(digits[i]));
  }
  return output.join('');
}

export function base58Decode(input: string): Uint8Array {
  if (input.length === 0) {
    return new Uint8Array(0);
  }
  const digits = [0];
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    const value = alphabet.indexOf(c);
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
  let zeros = 0;
  while (zeros < input.length && input[zeros] === alphabet.charAt(0)) {
    zeros++;
  }
  const output = new Uint8Array(zeros + digits.length);
  for (let i = 0; i < digits.length; i++) {
    output[output.length - 1 - i] = digits[i];
  }
  return output;
}
