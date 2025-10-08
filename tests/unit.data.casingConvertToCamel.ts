import { expect, it } from "@jest/globals";
import { casingConvertToCamel } from "../src";

it("run", async () => {
  const tests = [
    { original: "", camelCase: "" },
    // { original: "UPPERCASE", camelCase: "uppercase" },
    { original: "Lowercase", camelCase: "lowercase" },
    { original: "Capitalized", camelCase: "capitalized" },
    { original: "PascalCase", camelCase: "pascalCase" },
    { original: "camelCase", camelCase: "camelCase" },
    { original: "snake1_case", camelCase: "snake1Case" },
    { original: "SNAKE2_CASE", camelCase: "snake2Case" },
    { original: "kebab-case", camelCase: "kebabCase" },
    { original: "multiple__underscores", camelCase: "multipleUnderscores" },
    { original: "hello_world_test", camelCase: "helloWorldTest" },
    { original: "with_num1234_v1", camelCase: "withNum1234V1" },
  ];
  for (const test of tests) {
    expect(casingConvertToCamel(test.original)).toStrictEqual(test.camelCase);
  }
});
