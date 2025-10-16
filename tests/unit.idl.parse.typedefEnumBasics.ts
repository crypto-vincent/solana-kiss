import { expect, it } from "@jest/globals";
import { idlProgramParse, IdlTypeFlat, IdlTypePrefix } from "../src";

it("run", () => {
  // Create IDLs using different shortened formats
  const programIdl1 = idlProgramParse({
    types: [
      {
        name: "MyEnum",
        docs: ["Hello world!"],
        type: { variants: [] },
      },
    ],
  });
  const programIdl2 = idlProgramParse({
    types: [
      {
        name: "MyEnum",
        docs: ["Hello world!"],
        variants: [],
      },
    ],
  });
  const programIdl3 = idlProgramParse({
    types: {
      MyEnum: {
        docs: ["Hello world!"],
        type: { variants: [] },
      },
    },
  });
  const programIdl4 = idlProgramParse({
    types: {
      MyEnum: {
        docs: ["Hello world!"],
        variants: [],
      },
    },
  });
  // Assert that all are equivalent
  expect(programIdl1).toStrictEqual(programIdl2);
  expect(programIdl1).toStrictEqual(programIdl3);
  expect(programIdl1).toStrictEqual(programIdl4);
  // Assert that the content is correct
  expect(programIdl1.typedefs.get("MyEnum")).toStrictEqual({
    name: "MyEnum",
    docs: ["Hello world!"],
    serialization: undefined,
    repr: undefined,
    generics: [],
    typeFlat: IdlTypeFlat.enum({
      prefix: IdlTypePrefix.u8,
      mask: 0n,
      indexByName: new Map(),
      indexByCodeBigInt: new Map(),
      indexByCodeString: new Map(),
      variants: [],
    }),
  });
});
