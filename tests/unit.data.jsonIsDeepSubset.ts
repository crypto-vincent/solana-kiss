import { expect, it } from "@jest/globals";
import { jsonIsDeepSubset, JsonValue } from "../src";

it("run", async () => {
  const tests: Array<{
    subset: JsonValue;
    superset: JsonValue;
    isDeepSubset: boolean;
  }> = [
    {
      subset: {
        key: "Hello World",
      },
      superset: {
        key: "Hello World",
        another: 42,
      },
      isDeepSubset: true,
    },
    {
      subset: {
        key: "Hello World",
        another: 42,
      },
      superset: {
        key: "Hello World",
      },
      isDeepSubset: false,
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
      isDeepSubset: true,
    },
    {
      subset: { key: undefined },
      superset: {},
      isDeepSubset: true,
    },
    {
      subset: {},
      superset: { key: undefined },
      isDeepSubset: true,
    },
    {
      subset: [],
      superset: [1, 2, 3],
      isDeepSubset: true,
    },
    {
      subset: [1, 2],
      superset: [1, 2, 3],
      isDeepSubset: true,
    },
    {
      subset: [1, 2, 3, 4],
      superset: [1, 2, 3],
      isDeepSubset: false,
    },
    {
      subset: [1, 2, 3],
      superset: [],
      isDeepSubset: false,
    },
    {
      subset: [],
      superset: [],
      isDeepSubset: true,
    },
    {
      subset: 42,
      superset: 42,
      isDeepSubset: true,
    },
    {
      subset: 42,
      superset: 43,
      isDeepSubset: false,
    },
    {
      subset: null,
      superset: null,
      isDeepSubset: true,
    },
    {
      subset: null,
      superset: "not null",
      isDeepSubset: false,
    },
    {
      subset: "not null",
      superset: null,
      isDeepSubset: false,
    },
    {
      subset: {},
      superset: { anything: "value" },
      isDeepSubset: true,
    },
    {
      subset: { anything: [] },
      superset: { anything: [1, 2, 3] },
      isDeepSubset: true,
    },
    {
      subset: { anything: [] },
      superset: {},
      isDeepSubset: false,
    },
  ];
  for (const test of tests) {
    expect(test.isDeepSubset).toStrictEqual(
      jsonIsDeepSubset(test.subset, test.superset),
    );
  }
});
