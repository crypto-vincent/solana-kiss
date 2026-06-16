import { expect, it } from "@jest/globals";
import { deflateRawSync, deflateSync, gzipSync } from "zlib";
import { inflate, inflateRaw } from "../src";

it("run", () => {
  const payload = payloadForQuotaChecks();
  const rawCompressed = new Uint8Array(deflateRawSync(payload, { level: 9 }));
  const zlibCompressed = new Uint8Array(deflateSync(payload, { level: 9 }));
  const gzipCompressed = new Uint8Array(gzipSync(payload, { level: 9 }));

  expect(() => inflateRaw(rawCompressed, null, { maxDecodeOps: 16 })).toThrow(
    "Too many decode operations",
  );
  expect(
    inflateRaw(rawCompressed, null, { maxDecodeOps: 2_000_000 }),
  ).toStrictEqual(payload);
  expect(() => inflate(zlibCompressed, null, { maxDecodeOps: 16 })).toThrow(
    "Too many decode operations",
  );
  expect(() => inflate(gzipCompressed, null, { maxDecodeOps: 16 })).toThrow(
    "Too many decode operations",
  );
});

function payloadForQuotaChecks(): Uint8Array {
  return new Uint8Array(
    Buffer.from("solana-kiss decode-op test ".repeat(2048), "utf8"),
  );
}
