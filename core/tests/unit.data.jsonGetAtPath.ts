import { expect, it } from "@jest/globals";
import { jsonGetAtPath } from "../src";

it("run", async () => {
  const tests = [
    {
      haystack: {
        key: "Hello World",
      },
      path: "key",
      needle: "Hello World",
    },
    {
      haystack: {
        inner: {
          subkey: "Sub Hello",
        },
      },
      path: "inner.subkey",
      needle: "Sub Hello",
    },
    {
      haystack: {
        array: [{ name: "Alice" }, { name: "Bob" }],
      },
      path: "array[1].name",
      needle: "Bob",
    },
    {
      haystack: {
        array: [{ name: "Alice" }, { name: "Bob" }],
      },
      path: "array.0.name",
      needle: "Alice",
    },
  ];
  for (const test of tests) {
    expect(test.needle).toStrictEqual(jsonGetAtPath(test.haystack, test.path));
  }
});
