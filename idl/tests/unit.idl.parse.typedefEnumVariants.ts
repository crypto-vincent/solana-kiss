import { expect, it } from "@jest/globals";
import {
  idlProgramParse,
  IdlTypeFlat,
  IdlTypeFlatFields,
  IdlTypePrefix,
} from "../src";

it("run", () => {
  // Create IDLs using different shortened formats
  const programIdl1 = idlProgramParse({
    types: {
      MyEnum: {
        variants: [
          { name: "77", fields: [], code: 77 },
          { name: "Case1", fields: [] },
          { name: "Case2", fields: [], code: 42 },
          { name: "Case3", fields: [] },
        ],
      },
    },
  });
  const programIdl2 = idlProgramParse({
    types: {
      MyEnum: {
        variants: [
          { name: "77", code: 77 },
          { name: "Case1" },
          { name: "Case2", code: 42 },
          { name: "Case3" },
        ],
      },
    },
  });
  const programIdl3 = idlProgramParse({
    types: {
      MyEnum: {
        variants: [77, "Case1", { name: "Case2", code: 42 }, "Case3"],
      },
    },
  });
  const programIdl4 = idlProgramParse({
    types: {
      MyEnum: {
        variants: {
          "77": 77,
          Case1: 1,
          Case2: 42,
          Case3: { code: 3, fields: [] },
        },
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
    docs: undefined,
    serialization: undefined,
    repr: undefined,
    generics: [],
    typeFlat: IdlTypeFlat.enum({
      prefix: IdlTypePrefix.u8,
      variants: [
        {
          name: "77",
          code: BigInt(77),
          docs: undefined,
          fields: IdlTypeFlatFields.nothing(),
        },
        {
          name: "Case1",
          code: BigInt(1),
          docs: undefined,
          fields: IdlTypeFlatFields.nothing(),
        },
        {
          name: "Case2",
          code: BigInt(42),
          docs: undefined,
          fields: IdlTypeFlatFields.nothing(),
        },
        {
          name: "Case3",
          code: BigInt(3),
          docs: undefined,
          fields: IdlTypeFlatFields.nothing(),
        },
      ],
    }),
  });
});
