import { expect, it } from "@jest/globals";
import {
  casingLosslessConvertToCamel,
  casingLosslessConvertToSnake,
} from "../src";

it("run", async () => {
  const tests = [
    { input: "", output: "" },
    { input: "UPPERCASE", output: "UPPERCASE" },
    { input: "lowercase", output: "lowercase" },
    { input: "camelCase", output: "camelCase" },
    { input: "Capitalized", output: "Capitalized" },
    { input: "PascalCase", output: "PascalCase" },
    { input: "snake_case", output: "snakeCase" },
    { input: "snake1_case", output: "snake1Case" },
    { input: "SNAKE2_CASE", output: "SNAKE2_CASE" },
    { input: "with.pathLike.key", output: "with.pathLike.key" },
    { input: "with.path_like.key", output: "with.pathLike.key" },
    { input: "with_num1234_v1", output: "withNum1234V1" },
    { input: "withNum1234V1", output: "withNum1234V1" },
    { input: "1234with_num_v1", output: "1234withNumV1" },
    { input: "1234withNumV1", output: "1234withNumV1" },
    { input: "__starting", output: "_Starting" },
    { input: "ending__", output: "ending__" },
    { input: "mixed___splits", output: "mixed__Splits" },
    { input: "abc_v1_12", output: "abcV1_12" },
  ];
  for (const test of tests) {
    const camelCase = casingLosslessConvertToCamel(test.input);
    expect(camelCase).toStrictEqual(test.output);
    const snakeCase = casingLosslessConvertToSnake(camelCase);
    expect(casingLosslessConvertToCamel(snakeCase)).toStrictEqual(camelCase);
  }
});
