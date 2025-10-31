import { expect, it } from "@jest/globals";
import { jsonIsDeepEqual } from "../src";

it("run", async () => {
  const tests = [
    {
      left: { key: "Hello World" },
      right: { key: "Hello World", another: 42 },
      result: false,
    },
    {
      left: { key: "Hello World", another: 42 },
      right: { key: "Hello World" },
      result: false,
    },
    {
      left: { key: "Hello World" },
      right: { key: "Hello World" },
      result: true,
    },
    {
      left: { another: { nested: [1, 2] } },
      right: { another: { nested: [1, 2] } },
      result: true,
    },
    {
      left: { another: { nested: [1] } },
      right: { another: { nested: [1, 2] } },
      result: false,
    },
    {
      left: { another: { nested: [1, 2] } },
      right: { another: { nested: [1] } },
      result: false,
    },
    {
      left: [1, [1], { key: "value" }],
      right: [1, [1], { key: "value" }],
      result: true,
    },
    {
      left: [1, [1], { key: "value" }],
      right: [1, [1], { key: "value2" }],
      result: false,
    },
    {
      left: [1, [1], { key: "value" }],
      right: [1, [2], { key: "value" }],
      result: false,
    },
    {
      left: [1, [1, 2], { key: "value" }],
      right: [1, [1], { key: "value" }],
      result: false,
    },
    {
      left: { key: undefined },
      right: {},
      result: true,
    },
    {
      left: {},
      right: { key: undefined },
      result: true,
    },
  ];
  for (const test of tests) {
    expect(test.result).toStrictEqual(jsonIsDeepEqual(test.left, test.right));
  }
});
