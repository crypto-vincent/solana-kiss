import { expect, it } from "@jest/globals";
import { varIntDecode, varIntEncode } from "../src";

it("run", async () => {
  for (let value = 0n; value < 1000n; value++) {
    const referenceEncoded = referenceImplementationShortU16(Number(value));
    const encoded = varIntEncode(value);
    expect(encoded).toEqual(referenceEncoded);
    const decoded = varIntDecode(byteGetter, encoded, 0);
    expect(decoded[0]).toBe(encoded.length);
    expect(decoded[1]).toBe(value);
  }
  for (let value = 0n; value < 0xffffffff; value = value * 3n + 1n) {
    const encoded = varIntEncode(value);
    const decoded = varIntDecode(byteGetter, encoded, 0);
    expect(decoded[0]).toBe(encoded.length);
    expect(decoded[1]).toBe(value);
  }
});

function byteGetter(data: Uint8Array, offset: number): number {
  return data[offset]!;
}

function referenceImplementationShortU16(value: number): Uint8Array {
  if (value < 0 || value > 0xffff) {
    throw new RangeError("u16 overflow");
  }
  const out = new Array<number>();
  while (true) {
    let byte = value & 0x7f;
    value >>= 7;
    if (value !== 0) {
      byte |= 0x80;
    }
    out.push(byte);
    if (value === 0) {
      break;
    }
  }
  return new Uint8Array(out);
}
