import { expect, it } from "@jest/globals";
import {
  casingLosslessConvertToCamel,
  casingLosslessConvertToSnake,
} from "../src";

it("run", async () => {
  const tests = [
    { in: "", out: "" },
    { in: "UPPERCASE", out: "UPPERCASE" },
    { in: "lowercase", out: "lowercase" },
    { in: "camelCase", out: "camelCase" },
    { in: "Capitalized", out: "Capitalized" },
    { in: "PascalCase", out: "PascalCase" },
    { in: "snake_case", out: "snakeCase" },
    { in: "snake1_case", out: "snake1Case" },
    { in: "SNAKE2_CASE", out: "SNAKE2_CASE" },
    { in: "with.pathLike.key", out: "with.pathLike.key" },
    { in: "with.path_like.key", out: "with.pathLike.key" },
    { in: "with_num1234_v1", out: "withNum1234V1" },
    { in: "withNum1234V1", out: "withNum1234V1" },
    { in: "1234with_num_v1", out: "1234withNumV1" },
    { in: "1234withNumV1", out: "1234withNumV1" },
    { in: "__starting", out: "_Starting" },
    { in: "ending__", out: "ending__" },
    { in: "mixed___splits", out: "mixed__Splits" },
    { in: "abc_v1_12", out: "abcV1_12" },
  ];
  for (const test of tests) {
    const camelCase = casingLosslessConvertToCamel(test.in);
    expect(camelCase).toStrictEqual(test.out);
    const snakeCase = casingLosslessConvertToSnake(camelCase);
    expect(casingLosslessConvertToCamel(snakeCase)).toStrictEqual(camelCase);
  }
});
