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
    {
      subset: [],
      superset: [1, 2, 3],
      result: true,
    },
    {
      subset: [1, 2],
      superset: [1, 2, 3],
      result: true,
    },
    {
      subset: [1, 2, 3, 4],
      superset: [1, 2, 3],
      result: false,
    },
    {
      subset: [1, 2, 3],
      superset: [],
      result: false,
    },
    {
      subset: 42,
      superset: 42,
      result: true,
    },
    {
      subset: 42,
      superset: 43,
      result: false,
    },
    {
      subset: null,
      superset: null,
      result: true,
    },
    {
      subset: null,
      superset: "not null",
      result: false,
    },
    {
      subset: "not null",
      superset: null,
      result: false,
    },
    {
      subset: undefined,
      superset: { anything: "value" },
      result: true,
    },
    {
      subset: { anything: [] },
      superset: { anything: [1, 2, 3] },
      result: true,
    },
    {
      subset: { anything: [] },
      superset: {},
      result: false,
    },
  ];
  for (const test of tests) {
    expect(test.result).toStrictEqual(
      jsonIsDeepSubset(test.subset, test.superset),
    );
  }
});
