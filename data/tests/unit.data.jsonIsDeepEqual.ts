import { expect, it } from "@jest/globals";
import { jsonIsDeepEqual } from "../src";

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
      result: false,
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
        key: "Hello World",
      },
      superset: {
        key: "Hello World",
      },
      result: true,
    },
  ];
  for (const test of tests) {
    expect(test.result).toStrictEqual(
      jsonIsDeepEqual(test.subset, test.superset),
    );
  }
});
