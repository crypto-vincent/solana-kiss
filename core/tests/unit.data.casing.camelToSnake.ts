import { it } from "@jest/globals";
import { camelCaseToSnakeCase } from "../src/data/Casing";

it("run", async () => {
  const tests = [
    { camelCase: "helloWorld", snakeCase: "hello_world" },
    { camelCase: "withNum1234V1", snakeCase: "with_num1234_v1" },
    { camelCase: "withKISS", snakeCase: "with_kiss" },
    { camelCase: "withKiss", snakeCase: "with_kiss" },
    { camelCase: "eiqoWQj412nD", snakeCase: "eiqo_wqj412n_d" },
  ];
  for (const test of tests) {
    expect(test.snakeCase).toStrictEqual(camelCaseToSnakeCase(test.camelCase));
  }
});
