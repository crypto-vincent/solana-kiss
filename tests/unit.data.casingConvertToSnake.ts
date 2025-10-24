import { expect, it } from "@jest/globals";
import { casingConvertToSnake } from "../src";

it("run", async () => {
  const tests = [
    { in: "", out: "" },
    { in: "UPPERCASE", out: "uppercase" },
    { in: "Lowercase", out: "lowercase" },
    { in: "camelCase", out: "camel_case" },
    { in: "Capitalized", out: "capitalized" },
    { in: "PascalCase", out: "pascal_case" },
    { in: "snake_case", out: "snake_case" },
    { in: "snake1_case", out: "snake1_case" },
    { in: "SNAKE2_CASE", out: "snake2_case" },
    { in: "kebab-case", out: "kebab_case" },
    { in: "kebab-CASE", out: "kebab_case" },
    { in: "Title Case", out: "title_case" },
    { in: "with space", out: "with_space" },
    { in: "with ACRONYM", out: "with_acronym" },
    { in: "multiple   spaces", out: "multiple_spaces" },
    { in: "  leading _ trailing spaces  ", out: "leading_trailing_spaces" },
    { in: "multiple__underscores", out: "multiple_underscores" },
    { in: "\nhello\t_world_test", out: "hello_world_test" },
    { in: "with_num1234_v1", out: "with_num1234_v1" },
    { in: "withNum1234V1", out: "with_num1234_v1" },
    { in: "1234withNumV1", out: "1234with_num_v1" },
  ];
  for (const test of tests) {
    expect(casingConvertToSnake(test.in)).toStrictEqual(test.out);
  }
});
