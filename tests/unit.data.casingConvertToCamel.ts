import { expect, it } from "@jest/globals";
import { casingConvertToCamel } from "../src";

it("run", async () => {
  const tests = [
    { in: "", out: "" },
    { in: "UPPERCASE", out: "uppercase" },
    { in: "Lowercase", out: "lowercase" },
    { in: "camelCase", out: "camelCase" },
    { in: "Capitalized", out: "capitalized" },
    { in: "PascalCase", out: "pascalCase" },
    { in: "snake_case", out: "snakeCase" },
    { in: "snake1_case", out: "snake1Case" },
    { in: "SNAKE2_CASE", out: "snake2Case" },
    { in: "kebab-case", out: "kebabCase" },
    { in: "kebab-CASE", out: "kebabCase" },
    { in: "Title Case", out: "titleCase" },
    { in: "with space", out: "withSpace" },
    { in: "with.path_like.key", out: "with.pathLike.key" },
    { in: "with ACRONYM", out: "withAcronym" },
    { in: "multiple   spaces", out: "multipleSpaces" },
    { in: "  leading _ trailing spaces  ", out: "leadingTrailingSpaces" },
    { in: "multiple__underscores", out: "multipleUnderscores" },
    { in: "\nhello\t_world_test", out: "helloWorldTest" },
    { in: "with_num1234_v1", out: "withNum1234V1" },
    { in: "withNum1234V1", out: "withNum1234V1" },
    { in: "1234withNumV1", out: "1234withNumV1" },
    { in: "abc_v1_12", out: "abcV112" }, // TODO - should try to save underscore before number ?
  ];
  for (const test of tests) {
    expect(casingConvertToCamel(test.in)).toStrictEqual(test.out);
  }
});
