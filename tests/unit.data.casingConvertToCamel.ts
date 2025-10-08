import { expect, it } from "@jest/globals";
import { casingConvertToCamel } from "../src";

it("run", async () => {
  const tests = [
    { snakeCase: "hello_world", camelCase: "helloWorld" },
    { snakeCase: "with_num1234_v1", camelCase: "withNum1234V1" },
    { snakeCase: "with_kiss", camelCase: "withKiss" },
    { snakeCase: "a1_test", camelCase: "a1Test" },
  ];
  for (const test of tests) {
    expect(casingConvertToCamel(test.snakeCase)).toStrictEqual(test.camelCase);
  }
});
