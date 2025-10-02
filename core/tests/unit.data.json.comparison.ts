import { jsonIsSubset } from "../src";

it("run", async () => {
  const testsContains = [
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
  for (const testContain of testsContains) {
    expect(testContain.result).toStrictEqual(
      jsonIsSubset(testContain.subset, testContain.superset),
    );
  }
});
