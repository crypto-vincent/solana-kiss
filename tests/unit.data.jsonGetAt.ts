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
    { haystack: [1, 2, 3, 4, 5], path: ".2", needle: 3 },
    { haystack: [1, 2, 3, 4, 5], path: "2", needle: 3 },
    { haystack: [1, 2, 3, 4, 5], path: "[2]", needle: 3 },
    { haystack: { v: [1, 2, 3, 4, 5] }, path: "v.2", needle: 3 },
    { haystack: { v: [1, 2, 3, 4, 5] }, path: "v[2]", needle: 3 },
    { haystack: { v: [1, 2, 3, 4, 5] }, path: "v[-1]", needle: 5 },
    { haystack: { v: [1, 2, 3, 4, 5] }, path: "v[5]", needle: undefined },
  ];
  for (const test of tests) {
    expect(test.needle).toStrictEqual(jsonGetAt(test.haystack, test.path));
  }
});
