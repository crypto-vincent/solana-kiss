import { expect, it } from "@jest/globals";
import { casingCamelToSnake } from "../src";

it("run", async () => {
  const tests = [
    { camelCase: "helloWorld", snakeCase: "hello_world" },
    { camelCase: "withNum1234V1", snakeCase: "with_num1234_v1" },
    { camelCase: "withKISS", snakeCase: "with_kiss" },
    { camelCase: "withKiss", snakeCase: "with_kiss" },
    { camelCase: "eiqoWQj412nD", snakeCase: "eiqo_wqj412n_d" },
    { camelCase: "a1Test", snakeCase: "a1_test" },
    // TODO - is that exactly right how anchor does it ?
  ];
  for (const test of tests) {
    expect(casingCamelToSnake(test.camelCase)).toStrictEqual(test.snakeCase);
  }
});
