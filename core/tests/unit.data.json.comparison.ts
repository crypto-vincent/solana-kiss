import { expect, it } from "@jest/globals";
import { jsonIsDeepSubset } from "../src";

it("run", async () => {
  const testsContains = [
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
  ];
  for (const testContain of testsContains) {
    expect(testContain.result).toStrictEqual(
      jsonIsDeepSubset(testContain.subset, testContain.superset),
    );
  }
});
