import { expect, it } from "@jest/globals";
import { jsonIsDeepSubset } from "../src";

it("run", async () => {
  const tests = [
    {
      subset: {
        key: "Hello World",
      },
      superset: {
        key: "Hello World",
        another: 42,
      },
      result: true,
    },
    {
      subset: {
        key: "Hello World",
        another: 42,
      },
      superset: {
        key: "Hello World",
      },
      result: false,
    },
    {
      subset: {
        inner: {
          subkey: "Sub Hello",
        },
      },
      superset: {
        another: 42,
        inner: {
          subkey: "Sub Hello",
          anotherSub: true,
        },
      },
      result: true,
    },
    {
      subset: { key: undefined },
      superset: {},
      result: true,
    },
    {
      subset: {},
      superset: { key: undefined },
      result: true,
    },
  ];
  for (const test of tests) {
    expect(test.result).toStrictEqual(
      jsonIsDeepSubset(test.subset, test.superset),
    );
  }
});
