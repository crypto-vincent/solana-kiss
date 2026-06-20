import { expect, it } from "@jest/globals";
import { idlProgramParse, IdlTypeFlat } from "../src";

it("run", () => {
  // Create IDLs using different shortened formats
  const programIdl1 = idlProgramParse({
    types: [
      {
        name: "MyStruct",
        docs: ["Hello world!"],
        type: { fields: [] },
      },
    ],
  });
  const programIdl2 = idlProgramParse({
    types: [
      {
        name: "MyStruct",
        docs: ["Hello world!"],
        fields: [],
      },
    ],
  });
  const programIdl3 = idlProgramParse({
    types: {
      MyStruct: {
        docs: ["Hello world!"],
        type: { fields: [] },
      },
    },
  });
  const programIdl4 = idlProgramParse({
    types: {
      MyStruct: {
        docs: ["Hello world!"],
        fields: [],
      },
    },
  });
  // Assert that all are equivalent
  expect(programIdl1).toStrictEqual(programIdl2);
  expect(programIdl1).toStrictEqual(programIdl3);
  expect(programIdl1).toStrictEqual(programIdl4);
  // Assert that the content is correct
  expect(programIdl1.typedefs.get("MyStruct")).toStrictEqual({
    name: "MyStruct",
    docs: ["Hello world!"],
    serialization: undefined,
    repr: undefined,
    generics: [],
    typeFlat: IdlTypeFlat.structNothing(),
  });
});
