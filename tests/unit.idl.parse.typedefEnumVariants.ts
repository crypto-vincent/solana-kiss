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
          { code: 77, name: "77", fields: [] },
          { code: 3, name: "Case3", fields: [] },
          { code: 0, name: "0", fields: [] },
          { code: 1, name: "1", fields: [] },
          { code: 2, name: "Case2", fields: [] },
          { code: 42, name: "Case42", fields: [] },
        ],
      },
    },
  });
  const programIdl2 = idlProgramParse({
    types: {
      MyEnum: {
        variants: [
          { name: "0" },
          { name: "1" },
          { name: "Case2" },
          { name: "Case3" },
          { name: "Case42", code: 42 },
          { name: "77", code: 77 },
        ],
      },
    },
  });
  const programIdl3 = idlProgramParse({
    types: {
      MyEnum: {
        variants: [{}, {}, "Case2", "Case3", 77, { name: "Case42", code: 42 }],
      },
    },
  });
  const programIdl4 = idlProgramParse({
    types: {
      MyEnum: {
        variants: [0, 1, "Case2", "Case3", { name: "Case42", code: 42 }, 77],
      },
    },
  });
  const programIdl5 = idlProgramParse({
    types: {
      MyEnum: {
        variants: [77, 0, "Case2", "Case3", 1, { name: "Case42", code: 42 }],
      },
    },
  });
  const programIdl6 = idlProgramParse({
    types: {
      MyEnum: {
        variants: [
          "0",
          "1",
          "Case2",
          "Case3",
          { code: "77" },
          { name: "Case42", code: 42 },
        ],
      },
    },
  });
  const programIdl7 = idlProgramParse({
    types: {
      MyEnum: {
        variants: {
          "77": "77",
          Case2: 2,
          "1": 1,
          Case3: { code: 3, fields: [] },
          "0": { code: 0 },
          Case42: 42,
        },
      },
    },
  });
  // Assert that all are equivalent
  expect(programIdl1).toStrictEqual(programIdl2);
  expect(programIdl1).toStrictEqual(programIdl3);
  expect(programIdl1).toStrictEqual(programIdl4);
  expect(programIdl1).toStrictEqual(programIdl5);
  expect(programIdl1).toStrictEqual(programIdl6);
  expect(programIdl1).toStrictEqual(programIdl7);
  // Assert that the content is correct
  expect(programIdl1.typedefs.get("MyEnum")).toStrictEqual({
    name: "MyEnum",
    docs: undefined,
    serialization: undefined,
    repr: undefined,
    generics: [],
    typeFlat: IdlTypeFlat.enum({
      prefix: IdlTypePrefix.u8,
      mask: 111n,
      indexByName: new Map([
        ["0", 0],
        ["1", 1],
        ["Case2", 2],
        ["Case3", 3],
        ["Case42", 4],
        ["77", 5],
      ]),
      indexByCodeBigInt: new Map([
        [0n, 0],
        [1n, 1],
        [2n, 2],
        [3n, 3],
        [42n, 4],
        [77n, 5],
      ]),
      indexByCodeString: new Map([
        ["0", 0],
        ["1", 1],
        ["2", 2],
        ["3", 3],
        ["42", 4],
        ["77", 5],
      ]),
      variants: [
        {
          name: "0",
          code: 0n,
          docs: undefined,
          fields: IdlTypeFlatFields.nothing(),
        },
        {
          name: "1",
          code: 1n,
          docs: undefined,
          fields: IdlTypeFlatFields.nothing(),
        },
        {
          name: "Case2",
          code: 2n,
          docs: undefined,
          fields: IdlTypeFlatFields.nothing(),
        },
        {
          name: "Case3",
          code: 3n,
          docs: undefined,
          fields: IdlTypeFlatFields.nothing(),
        },
        {
          name: "Case42",
          code: 42n,
          docs: undefined,
          fields: IdlTypeFlatFields.nothing(),
        },
        {
          name: "77",
          code: 77n,
          docs: undefined,
          fields: IdlTypeFlatFields.nothing(),
        },
      ],
    }),
  });
});
