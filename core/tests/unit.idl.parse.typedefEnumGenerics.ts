import { idlProgramParse, IdlTypeFlat, IdlTypePrefix } from "../src";

it("run", () => {
  // Create IDLs using different shortened formats
  const programIdl1 = idlProgramParse({
    types: [
      {
        name: "MyEnum",
        generics: [{ kind: "type", name: "A" }, { name: "B" }],
        type: { variants: [] },
      },
    ],
  });
  const programIdl2 = idlProgramParse({
    types: [
      {
        name: "MyEnum",
        generics: [{ kind: "type", name: "A" }, { name: "B" }],
        variants: [],
      },
    ],
  });
  const programIdl3 = idlProgramParse({
    types: [
      {
        name: "MyEnum",
        generics: ["A", "B"],
        variants: [],
      },
    ],
  });
  const programIdl4 = idlProgramParse({
    types: {
      MyEnum: {
        generics: [{ kind: "type", name: "A" }, { name: "B" }],
        type: { variants: [] },
      },
    },
  });
  const programIdl5 = idlProgramParse({
    types: {
      MyEnum: {
        generics: ["A", "B"],
        variants: [],
      },
    },
  });
  // Assert that all are equivalent
  expect(programIdl1).toStrictEqual(programIdl2);
  expect(programIdl1).toStrictEqual(programIdl3);
  expect(programIdl1).toStrictEqual(programIdl4);
  expect(programIdl1).toStrictEqual(programIdl5);
  // Assert that the content is correct
  expect(programIdl1.typedefs.get("MyEnum")).toStrictEqual({
    name: "MyEnum",
    docs: undefined,
    serialization: undefined,
    repr: undefined,
    generics: ["A", "B"],
    typeFlat: IdlTypeFlat.enum({
      prefix: IdlTypePrefix.U8,
      variants: [],
    }),
  });
});
