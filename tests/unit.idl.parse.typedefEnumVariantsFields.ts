import { expect, it } from "@jest/globals";
import {
  idlProgramParse,
  IdlTypeFull,
  IdlTypeFullFields,
  IdlTypePrefix,
  IdlTypePrimitive,
} from "../src";

it("run", () => {
  // Create IDLs using different shortened formats
  const programIdl1 = idlProgramParse({
    accounts: {
      MyEnum: {
        variants: [
          {
            name: "Named",
            fields: [
              { name: "f1", type: "u16" },
              { name: "f2", type: { vec: "u8" } },
              { name: "f3", type: "string" },
            ],
          },
          {
            name: "Unnamed",
            fields: [
              { type: "u64" },
              { type: ["u8"] },
              { type: { vec: "u8" } },
            ],
          },
          { name: "Empty", fields: [] },
        ],
      },
    },
  });
  const programIdl2 = idlProgramParse({
    accounts: {
      MyEnum: {
        variants: [
          {
            name: "Named",
            fields: [
              { name: "f1", type: "u16" },
              { name: "f2", vec: "u8" },
              { name: "f3", type: "string" },
            ],
          },
          {
            name: "Unnamed",
            fields: ["u64", ["u8"], { vec: "u8" }],
          },
          { name: "Empty" },
        ],
      },
    },
  });
  // Assert that all are equivalent
  expect(programIdl1).toStrictEqual(programIdl2);
  // Assert that the content is correct
  expect(programIdl1.accounts.get("MyEnum")!.typeFull).toStrictEqual(
    IdlTypeFull.enum({
      prefix: IdlTypePrefix.u8,
      mask: 3n,
      indexByName: new Map([
        ["Named", 0],
        ["Unnamed", 1],
        ["Empty", 2],
      ]),
      indexByCodeBigInt: new Map([
        [0n, 0],
        [1n, 1],
        [2n, 2],
      ]),
      indexByCodeString: new Map([
        ["0", 0],
        ["1", 1],
        ["2", 2],
      ]),
      variants: [
        {
          name: "Named",
          code: 0n,
          fields: IdlTypeFullFields.named([
            {
              name: "f1",
              content: IdlTypeFull.primitive(IdlTypePrimitive.u16),
            },
            {
              name: "f2",
              content: IdlTypeFull.vec({
                prefix: IdlTypePrefix.u32,
                items: IdlTypeFull.primitive(IdlTypePrimitive.u8),
              }),
            },
            {
              name: "f3",
              content: IdlTypeFull.string({
                prefix: IdlTypePrefix.u32,
              }),
            },
          ]),
        },
        {
          name: "Unnamed",
          code: 1n,
          fields: IdlTypeFullFields.unnamed([
            {
              content: IdlTypeFull.primitive(IdlTypePrimitive.u64),
            },
            {
              content: IdlTypeFull.vec({
                prefix: IdlTypePrefix.u32,
                items: IdlTypeFull.primitive(IdlTypePrimitive.u8),
              }),
            },
            {
              content: IdlTypeFull.vec({
                prefix: IdlTypePrefix.u32,
                items: IdlTypeFull.primitive(IdlTypePrimitive.u8),
              }),
            },
          ]),
        },
        {
          name: "Empty",
          code: 2n,
          fields: IdlTypeFullFields.nothing(),
        },
      ],
    }),
  );
});
