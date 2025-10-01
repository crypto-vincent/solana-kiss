import { idlProgramParse, IdlTypeFlat, IdlTypePrefix } from "../src";

it("run", () => {
  // Create IDLs using different shortened formats
  const idlProgram1 = idlProgramParse({
    types: [
      {
        name: "MyEnum",
        generics: [{ kind: "type", name: "A" }, { name: "B" }],
        type: { variants: [] },
      },
    ],
  });
  const idlProgram2 = idlProgramParse({
    types: [
      {
        name: "MyEnum",
        generics: [{ kind: "type", name: "A" }, { name: "B" }],
        variants: [],
      },
    ],
  });
  const idlProgram3 = idlProgramParse({
    types: [
      {
        name: "MyEnum",
        generics: ["A", "B"],
        variants: [],
      },
    ],
  });
  const idlProgram4 = idlProgramParse({
    types: {
      MyEnum: {
        generics: [{ kind: "type", name: "A" }, { name: "B" }],
        type: { variants: [] },
      },
    },
  });
  const idlProgram5 = idlProgramParse({
    types: {
      MyEnum: {
        generics: ["A", "B"],
        variants: [],
      },
    },
  });
  // Assert that all are equivalent
  expect(idlProgram1).toStrictEqual(idlProgram2);
  expect(idlProgram1).toStrictEqual(idlProgram3);
  expect(idlProgram1).toStrictEqual(idlProgram4);
  expect(idlProgram1).toStrictEqual(idlProgram5);
  // Assert that the content is correct
  expect(idlProgram1.typedefs.get("MyEnum")).toStrictEqual({
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
