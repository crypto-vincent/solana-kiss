/**
 * Decodes a variable-length integer from a byte array into a bigint.
 * @param data - Raw binary buffer.
 * @param offset - Byte offset to start reading.
 * @returns Tuple of `[bytesConsumed, decodedValue]`.
 */
export function varIntDecode<Data>(
  byteGetter: (data: Data, offset: number) => number, // TODO - this is ugly
  data: Data,
  offset: number,
): [number, bigint] {
  let value = 0n;
  let shift = 0n;
  let length = 0;
  while (true) {
    const byte = byteGetter(data, offset + length++);
    if (byte < 0) {
      throw new Error(`VarInt: decode: negative byte encountered: ${byte}`);
    }
    value |= (BigInt(byte) & 0b1111111n) << shift;
    shift += 7n;
    if ((byte & 0b10000000) === 0) {
      return [length, value];
    }
  }
}

/**
 * Encodes a bigint into a variable-length integer as a byte array.
 * @param value - Value to encode (must be non-negative).
 * @returns Encoded variable-length integer as a Uint8Array.
 */
export function varIntEncode(value: bigint): Uint8Array {
  if (value < 0n) {
    throw new Error(`VarInt: encode: negative value not supported: ${value}`);
  }
  const bytes = [];
  while (true) {
    let byte = Number(value & 0b1111111n);
    value >>= 7n;
    if (value !== 0n) {
      byte |= 0b10000000;
    }
    bytes.push(byte);
    if (value === 0n) {
      break;
    }
  }
  return new Uint8Array(bytes);
}
