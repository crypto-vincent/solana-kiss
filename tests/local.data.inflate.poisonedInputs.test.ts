import { expect, it } from "@jest/globals";
import { inflate } from "../src";

it("run", () => {
  const inputs = poisonInputs(250);
  for (const input of inputs) {
    try {
      const out = inflate(input, null);
      expect(out).toBeInstanceOf(Uint8Array);
    } catch (error) {
      expect(error).toBeDefined();
    }
  }
});

function poisonInputs(count: number): Array<Uint8Array> {
  const inputs = new Array<Uint8Array>();
  let seed = 0xdeadbeef;
  for (let i = 0; i < count; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const len = 1 + (seed % 96);
    const bytes = new Uint8Array(len);
    for (let j = 0; j < len; j++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      bytes[j] = seed & 0xff;
    }
    inputs.push(bytes);
  }
  return inputs;
}
