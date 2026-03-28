import { expect, it } from "@jest/globals";
import {
  casingLosslessConvertToCamel,
  casingLosslessConvertToSnake,
} from "../src";

it("run", async () => {
  const tests = [
    { input: "", output: "" },
    { input: "UPPERCASE", output: "_u_p_p_e_r_c_a_s_e" },
    { input: "lowercase", output: "lowercase" },
    { input: "camelCase", output: "camel_case" },
    { input: "Capitalized", output: "_capitalized" },
    { input: "PascalCase", output: "_pascal_case" },
    { input: "snake_case", output: "snake_case" },
    { input: "snake1_case", output: "snake1_case" },
    { input: "SNAKE2_CASE", output: "_s_n_a_k_e2__c_a_s_e" },
    { input: "with.pathLike.key", output: "with.path_like.key" },
    { input: "with.path_like.key", output: "with.path_like.key" },
    { input: "with_num1234_v1", output: "with_num1234_v1" },
    { input: "withNum1234V1", output: "with_num1234_v1" },
    { input: "1234with_num_v1", output: "1234with_num_v1" },
    { input: "1234withNumV1", output: "1234with_num_v1" },
    { input: "_Starting", output: "__starting" },
    { input: "ending__", output: "ending__" },
    { input: "mixed__Splits", output: "mixed___splits" },
    { input: "abcV1_12", output: "abc_v1_12" },
  ];
  for (const test of tests) {
    const snakeCase = casingLosslessConvertToSnake(test.input);
    expect(snakeCase).toStrictEqual(test.output);
    const camelCase = casingLosslessConvertToCamel(snakeCase);
    expect(casingLosslessConvertToSnake(camelCase)).toStrictEqual(snakeCase);
  }
});
