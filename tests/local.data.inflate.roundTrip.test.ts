import { expect, it } from "@jest/globals";
import { deflateRawSync, deflateSync, gzipSync } from "zlib";
import { inflate, inflateRaw } from "../src";

it("run", () => {
  for (const payload of roundTripPayloads()) {
    const zlibCompressed = new Uint8Array(deflateSync(payload));
    const gzipCompressed = new Uint8Array(gzipSync(payload));
    const rawCompressed = new Uint8Array(deflateRawSync(payload));

    expect(inflate(zlibCompressed, null)).toStrictEqual(payload);
    expect(inflate(gzipCompressed, null)).toStrictEqual(payload);
    expect(inflateRaw(rawCompressed, null)).toStrictEqual(payload);
  }
});

function roundTripPayloads(): Array<Uint8Array> {
  return [
    new Uint8Array(0),
    new Uint8Array([0]),
    new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]),
    new Uint8Array(Buffer.from("hello world", "utf8")),
    new Uint8Array(
      Buffer.from("solana-kiss inflate test payload\n".repeat(32), "utf8"),
    ),
    new Uint8Array(Buffer.from("A".repeat(4096), "utf8")),
    new Uint8Array(
      Buffer.from(
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".repeat(
          64,
        ),
        "utf8",
      ),
    ),
    sequencePayload(256),
    sequencePayload(1024),
    seededRandomPayload(2048, 0x12345678),
  ];
}

function sequencePayload(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = i & 0xff;
  }
  return bytes;
}

function seededRandomPayload(length: number, seed0: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let seed = seed0 >>> 0;
  for (let i = 0; i < bytes.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    bytes[i] = seed & 0xff;
  }
  return bytes;
}
