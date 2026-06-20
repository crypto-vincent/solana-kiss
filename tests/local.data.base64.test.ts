import { expect, it } from "@jest/globals";
import { base64Decode, base64Encode, utf8Encode } from "../src";

function referenceImplementation(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data));
}

it("run", async () => {
  const tests = [
    { bytes: [1, 2, 3, 4, 5] },
    { bytes: [] },
    { bytes: [1, 2, 3, 4, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { bytes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] },
    { bytes: [255, 255, 255, 255, 255] },
    { bytes: [42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42] },
    { bytes: [1, 2, 3, 4, 5, 6, 7] },
    { utf8: "" },
    { utf8: "a" },
    { utf8: "abc" },
    { utf8: "Hello, World!" },
    { utf8: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
    { utf8: "1234567890" },
    { utf8: "abcdefghijklmnopqrstuvwxyz" },
    { utf8: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" },
    { utf8: "+1234567890123456789012345678901234567890123456789012345678901+" },
    {
      utf8: [
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit,",
        "sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
        "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
      ].join(" "),
    },
  ];
  for (const test of tests) {
    const bytes = test.bytes
      ? new Uint8Array(test.bytes)
      : utf8Encode(test.utf8);
    const encoded = base64Encode(bytes);
    const decoded = base64Decode(encoded);
    const expected = referenceImplementation(bytes);
    expect(decoded).toStrictEqual(bytes);
    expect(encoded).toStrictEqual(expected);
  }
});
