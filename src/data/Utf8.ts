const cachedDecoder = new TextDecoder();
const cachedEncoder = new TextEncoder();

export function utf8Decode(encoded: Uint8Array): string {
  return cachedDecoder.decode(encoded);
}

export function utf8Encode(decoded: string): Uint8Array {
  return cachedEncoder.encode(decoded);
}
