import { expect, it } from "@jest/globals";
import { jsonGetAt } from "../src";

it("run", async () => {
  const tests = [
    {
      haystack: { key: "Hello World" },
      path: "key",
      needle: "Hello World",
    },
    {
      haystack: { inner: { subkey: "Sub Hello" } },
      path: "inner.subkey",
      needle: "Sub Hello",
    },
    {
      haystack: { array: [{ name: "Alice" }, { name: "Bob" }] },
      path: "array[1].name",
      needle: "Bob",
    },
    {
      haystack: { array: [{ name: "Alice" }, { name: "Bob" }] },
      path: "array.0.name",
      needle: "Alice",
    },
    {
      haystack: { array: [{ name: "Alice" }, { name: "Bob" }] },
      path: "array/-1/name",
      needle: "Bob",
    },
    {
      haystack: { array: [{ name: "Alice" }, { name: "Bob" }] },
      path: "array[3].name",
      needle: undefined,
    },
    {
      haystack: { inner: {} },
      path: "inner.missing",
      needle: undefined,
    },
    {
      haystack: {},
      path: "very[2].deep.missing",
      needle: undefined,
    },
    {
      haystack: { camelCase: { valueOne: 1, value_two: 2 } },
      path: "camel_case.value_one",
      needle: 1,
    },
    {
      haystack: { camelCase: { valueOne: 1, value_two: 2 } },
      path: "camelCase.valueTwo",
      needle: 2,
    },
  ];
  for (const test of tests) {
    expect(test.needle).toStrictEqual(jsonGetAt(test.haystack, test.path));
  }
});
