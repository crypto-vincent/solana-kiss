const cachedDecoder = new TextDecoder();
const cachedEncoder = new TextEncoder();

/**
 * Decodes a UTF-8 encoded byte array into a string.
 * @param encoded - The UTF-8 bytes to decode.
 * @returns The decoded string.
 */
export function utf8Decode(encoded: Uint8Array): string {
  return cachedDecoder.decode(encoded);
}

/**
 * Encodes a string into a UTF-8 byte array.
 * @param decoded - The string to encode.
 * @returns The UTF-8 encoded bytes.
 */
export function utf8Encode(decoded: string): Uint8Array {
  return cachedEncoder.encode(decoded);
}
