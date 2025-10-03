import { expect, it } from "@jest/globals";
import { idlProgramParse, IdlTypeFlat } from "../src";

it("run", () => {
  // Create IDLs using different shortened formats
  const programIdl1 = idlProgramParse({
    types: [
      {
        name: "MyStruct",
        generics: [{ kind: "type", name: "A" }, { name: "B" }],
        type: { fields: [] },
      },
    ],
  });
  const programIdl2 = idlProgramParse({
    types: [
      {
        name: "MyStruct",
        generics: [{ kind: "type", name: "A" }, { name: "B" }],
        fields: [],
      },
    ],
  });
  const programIdl3 = idlProgramParse({
    types: [
      {
        name: "MyStruct",
        generics: ["A", "B"],
        fields: [],
      },
    ],
  });
  const programIdl4 = idlProgramParse({
    types: {
      MyStruct: {
        generics: [{ kind: "type", name: "A" }, { name: "B" }],
        type: { fields: [] },
      },
    },
  });
  const programIdl5 = idlProgramParse({
    types: {
      MyStruct: {
        generics: ["A", "B"],
        fields: [],
      },
    },
  });
  // Assert that all are equivalent
  expect(programIdl1).toStrictEqual(programIdl2);
  expect(programIdl1).toStrictEqual(programIdl3);
  expect(programIdl1).toStrictEqual(programIdl4);
  expect(programIdl1).toStrictEqual(programIdl5);
  // Assert that the content is correct
  expect(programIdl1.typedefs.get("MyStruct")).toStrictEqual({
    name: "MyStruct",
    docs: undefined,
    serialization: undefined,
    repr: undefined,
    generics: ["A", "B"],
    typeFlat: IdlTypeFlat.structNothing(),
  });
});
