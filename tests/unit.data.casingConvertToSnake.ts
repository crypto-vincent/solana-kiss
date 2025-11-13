import { expect, it } from "@jest/globals";
import {
  casingLosslessConvertToCamel,
  casingLosslessConvertToSnake,
} from "../src";

it("run", async () => {
  const tests = [
    { in: "", out: "" },
    { in: "UPPERCASE", out: "_u_p_p_e_r_c_a_s_e" },
    { in: "lowercase", out: "lowercase" },
    { in: "camelCase", out: "camel_case" },
    { in: "Capitalized", out: "_capitalized" },
    { in: "PascalCase", out: "_pascal_case" },
    { in: "snake_case", out: "snake_case" },
    { in: "snake1_case", out: "snake1_case" },
    { in: "SNAKE2_CASE", out: "_s_n_a_k_e2__c_a_s_e" },
    { in: "with.pathLike.key", out: "with.path_like.key" },
    { in: "with.path_like.key", out: "with.path_like.key" },
    { in: "with_num1234_v1", out: "with_num1234_v1" },
    { in: "withNum1234V1", out: "with_num1234_v1" },
    { in: "1234with_num_v1", out: "1234with_num_v1" },
    { in: "1234withNumV1", out: "1234with_num_v1" },
    { in: "_Starting", out: "__starting" },
    { in: "ending__", out: "ending__" },
    { in: "mixed__Splits", out: "mixed___splits" },
    { in: "abcV1_12", out: "abc_v1_12" },
  ];
  for (const test of tests) {
    const snakeCase = casingLosslessConvertToSnake(test.in);
    expect(snakeCase).toStrictEqual(test.out);
    const camelCase = casingLosslessConvertToCamel(snakeCase);
    expect(casingLosslessConvertToSnake(camelCase)).toStrictEqual(snakeCase);
  }
});
