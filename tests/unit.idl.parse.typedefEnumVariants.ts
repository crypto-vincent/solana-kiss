import { expect, it } from "@jest/globals";
import {
  IdlProgram,
  idlProgramParse,
  IdlTypeFull,
  IdlTypeFullFields,
  IdlTypePrefix,
} from "../src";

it("run", () => {
  // Create IDLs using different shortened formats
  const programIdl1 = idlProgramParse({
    accounts: {
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
    accounts: {
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
    accounts: {
      MyEnum: {
        variants: [{}, {}, "Case2", "Case3", 77, { name: "Case42", code: 42 }],
      },
    },
  });
  const programIdl4 = idlProgramParse({
    accounts: {
      MyEnum: {
        variants: [0, 1, "Case2", "Case3", { name: "Case42", code: 42 }, 77],
      },
    },
  });
  const programIdl5 = idlProgramParse({
    accounts: {
      MyEnum: {
        variants: [77, 0, "Case2", "Case3", 1, { name: "Case42", code: 42 }],
      },
    },
  });
  const programIdl6 = idlProgramParse({
    accounts: {
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
    accounts: {
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
  expectEqualEnum(programIdl1, programIdl2);
  expectEqualEnum(programIdl1, programIdl3);
  expectEqualEnum(programIdl1, programIdl4);
  expectEqualEnum(programIdl1, programIdl5);
  expectEqualEnum(programIdl1, programIdl6);
  expectEqualEnum(programIdl1, programIdl7);
  // Assert that the content is correct
  expect(programIdl1.accounts.get("MyEnum")!.typeFull).toStrictEqual(
    IdlTypeFull.enum({
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
          fields: IdlTypeFullFields.nothing(),
        },
        {
          name: "1",
          code: 1n,
          fields: IdlTypeFullFields.nothing(),
        },
        {
          name: "Case2",
          code: 2n,
          fields: IdlTypeFullFields.nothing(),
        },
        {
          name: "Case3",
          code: 3n,
          fields: IdlTypeFullFields.nothing(),
        },
        {
          name: "Case42",
          code: 42n,
          fields: IdlTypeFullFields.nothing(),
        },
        {
          name: "77",
          code: 77n,
          fields: IdlTypeFullFields.nothing(),
        },
      ],
    }),
  );
});

function expectEqualEnum(
  leftProgramIdl: IdlProgram,
  rightProgramIdl: IdlProgram,
) {
  expect(leftProgramIdl.accounts.get("MyEnum")!.typeFull).toStrictEqual(
    rightProgramIdl.accounts.get("MyEnum")!.typeFull,
  );
}
