const cachedDecoder = new TextDecoder();
const cachedEncoder = new TextEncoder();

/**
 * Decodes UTF-8 bytes into a string.
 * @param encoded - UTF-8 bytes.
 * @returns Decoded string.
 */
export function utf8Decode(encoded: Uint8Array): string {
  return cachedDecoder.decode(encoded);
}

/**
 * Encodes a string into UTF-8 bytes.
 * @param decoded - String to encode.
 * @returns UTF-8 bytes.
 */
export function utf8Encode(decoded: string): Uint8Array {
  return cachedEncoder.encode(decoded);
}
