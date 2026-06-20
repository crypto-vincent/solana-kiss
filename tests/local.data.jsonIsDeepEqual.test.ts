import { expect, it } from "@jest/globals";
import { jsonIsDeepEqual, JsonValue } from "../src";

it("run", async () => {
  const tests: Array<{
    left: JsonValue;
    right: JsonValue;
    isDeepEqual: boolean;
  }> = [
    {
      left: { key: "Hello World" },
      right: { key: "Hello World" },
      isDeepEqual: true,
    },
    {
      left: { key: "Hello World" },
      right: { key: "Hello World", another: 42 },
      isDeepEqual: false,
    },
    {
      left: { key: "Hello World", another: 42 },
      right: { key: "Hello World" },
      isDeepEqual: false,
    },
    {
      left: { key: "Hello World" },
      right: { key: "Nope" },
      isDeepEqual: false,
    },
    {
      left: { key: "Hello World" },
      right: { key: 42 },
      isDeepEqual: false,
    },
    {
      left: { key: 0 },
      right: { key: null },
      isDeepEqual: false,
    },
    {
      left: { another: { nested: [1, 2] } },
      right: { another: { nested: [1, 2] } },
      isDeepEqual: true,
    },
    {
      left: { another: { nested: [1] } },
      right: { another: { nested: [1, 2] } },
      isDeepEqual: false,
    },
    {
      left: { another: { nested: [1, 2] } },
      right: { another: { nested: [1] } },
      isDeepEqual: false,
    },
    {
      left: [1, [1], { key: "value" }],
      right: [1, [1], { key: "value" }],
      isDeepEqual: true,
    },
    {
      left: [1, [1], { key: "value" }],
      right: [1, [1], { key: "value2" }],
      isDeepEqual: false,
    },
    {
      left: [1, [1], { key: "value" }],
      right: [1, [2], { key: "value" }],
      isDeepEqual: false,
    },
    {
      left: [1, [1, 2], { key: "value" }],
      right: [1, [1], { key: "value" }],
      isDeepEqual: false,
    },
    {
      left: { toString: undefined },
      right: { toString: undefined },
      isDeepEqual: true,
    },
    {
      left: { toString: undefined },
      right: {},
      isDeepEqual: true,
    },
    {
      left: {},
      right: { toString: undefined },
      isDeepEqual: true,
    },
  ];
  for (const test of tests) {
    expect(test.isDeepEqual).toStrictEqual(
      jsonIsDeepEqual(test.left, test.right),
    );
  }
});
