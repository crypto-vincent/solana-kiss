import { expect, it } from "@jest/globals";
import { deflateRawSync } from "zlib";
import { inflateRaw } from "../src";

it("run", () => {
  const hugePlaintext = Buffer.from("A".repeat(2 * 1024 * 1024), "utf8");
  const compressed = new Uint8Array(
    deflateRawSync(hugePlaintext, { level: 9 }),
  );

  expect(() =>
    inflateRaw(compressed, null, { maxOutputBytes: 128 * 1024 }),
  ).toThrow("Output exceeds maxOutputBytes");
});
