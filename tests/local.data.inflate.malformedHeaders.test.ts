import { expect, it } from "@jest/globals";
import { inflate } from "../src";

it("run", () => {
  const unterminatedGzipName = new Uint8Array([
    0x1f, 0x8b, 0x08, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0x61, 0x62,
    0x63,
  ]);

  expect(() => inflate(unterminatedGzipName, null)).toThrow(
    "Unterminated gzip filename",
  );
  expect(() => inflate(new Uint8Array([0x78, 0x9c, 0x01]), null)).toThrow(
    "Truncated zlib payload",
  );
});
