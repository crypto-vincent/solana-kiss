import { idlProgramParse } from "../src";

it("run", () => {
  // Create IDLs using different shortened formats
  const programIdl1 = idlProgramParse({
    errors: [
      {
        name: "MyError",
        code: 42,
      },
    ],
  });
  const programIdl2 = idlProgramParse({
    errors: {
      MyError: 42,
    },
  });
  // Assert that all are equivalent
  expect(programIdl1).toStrictEqual(programIdl2);
  // Assert that the content is correct
  expect(programIdl1.errors.get("MyError")).toStrictEqual({
    name: "MyError",
    docs: undefined,
    code: 42,
    msg: undefined,
  });
});
