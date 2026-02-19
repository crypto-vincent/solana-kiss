const cachedDecoder = new TextDecoder();
const cachedEncoder = new TextEncoder();

/** Decodes a UTF-8 byte array to a string. */
export function utf8Decode(encoded: Uint8Array): string {
  return cachedDecoder.decode(encoded);
}

/** Encodes a string to a UTF-8 byte array. */
export function utf8Encode(decoded: string): Uint8Array {
  return cachedEncoder.encode(decoded);
}
