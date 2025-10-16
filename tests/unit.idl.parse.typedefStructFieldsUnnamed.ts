import { expect, it } from "@jest/globals";
import {
  idlProgramParse,
  IdlTypeFlat,
  IdlTypeFlatFields,
  IdlTypePrefix,
  IdlTypePrimitive,
} from "../src";

it("run", () => {
  // Create IDLs using different shortened formats
  const programIdl1 = idlProgramParse({
    types: {
      MyStruct: {
        fields: [
          { type: "u8" },
          { type: "u64" },
          { type: "string" },
          { type: ["u8"] },
          { type: { vec: "u8" } },
          { type: ["u32", 4] },
          { type: { array: ["u32", 4] } },
          { type: { fields: [] } },
          { type: { variants: [] } },
          { type: "Other" },
          { type: { defined: "Other" } },
          { type: { defined: { name: "Other" } } },
          { type: { generic: "G" } },
          { type: { option: "u8" } },
          { type: { option32: "u8" } },
          { type: { fields: [] }, docs: ["Hello"] },
        ],
      },
    },
  });
  const programIdl2 = idlProgramParse({
    types: {
      MyStruct: {
        fields: [
          "u8",
          "u64",
          "string",
          ["u8"],
          { vec: "u8" },
          ["u32", 4],
          { array: ["u32", 4] },
          { fields: [] },
          { variants: [] },
          "Other",
          { defined: "Other" },
          { defined: { name: "Other" } },
          { generic: "G" },
          { option: "u8" },
          { option32: "u8" },
          { docs: ["Hello"], fields: [] },
        ],
      },
    },
  });
  // Asser that the two notations are equivalent
  expect(programIdl1).toStrictEqual(programIdl2);
  // Assert that the content is correct
  expect(programIdl1.typedefs.get("MyStruct")).toStrictEqual({
    name: "MyStruct",
    docs: undefined,
    serialization: undefined,
    repr: undefined,
    generics: [],
    typeFlat: IdlTypeFlat.struct({
      fields: IdlTypeFlatFields.unnamed([
        {
          docs: undefined,
          content: IdlTypeFlat.primitive(IdlTypePrimitive.u8),
        },
        {
          docs: undefined,
          content: IdlTypeFlat.primitive(IdlTypePrimitive.u64),
        },
        {
          docs: undefined,
          content: IdlTypeFlat.string({
            prefix: IdlTypePrefix.u32,
          }),
        },
        {
          docs: undefined,
          content: IdlTypeFlat.vec({
            prefix: IdlTypePrefix.u32,
            items: IdlTypeFlat.primitive(IdlTypePrimitive.u8),
          }),
        },
        {
          docs: undefined,
          content: IdlTypeFlat.vec({
            prefix: IdlTypePrefix.u32,
            items: IdlTypeFlat.primitive(IdlTypePrimitive.u8),
          }),
        },
        {
          docs: undefined,
          content: IdlTypeFlat.array({
            items: IdlTypeFlat.primitive(IdlTypePrimitive.u32),
            length: IdlTypeFlat.const({ literal: 4 }),
          }),
        },
        {
          docs: undefined,
          content: IdlTypeFlat.array({
            items: IdlTypeFlat.primitive(IdlTypePrimitive.u32),
            length: IdlTypeFlat.const({ literal: 4 }),
          }),
        },
        {
          docs: undefined,
          content: IdlTypeFlat.structNothing(),
        },
        {
          docs: undefined,
          content: IdlTypeFlat.enum({
            prefix: IdlTypePrefix.u8,
            mask: 0n,
            indexByName: new Map(),
            indexByCodeBigInt: new Map(),
            indexByCodeString: new Map(),
            variants: [],
          }),
        },
        {
          docs: undefined,
          content: IdlTypeFlat.defined({
            name: "Other",
            generics: [],
          }),
        },
        {
          docs: undefined,
          content: IdlTypeFlat.defined({
            name: "Other",
            generics: [],
          }),
        },
        {
          docs: undefined,
          content: IdlTypeFlat.defined({
            name: "Other",
            generics: [],
          }),
        },
        {
          docs: undefined,
          content: IdlTypeFlat.generic({
            symbol: "G",
          }),
        },
        {
          docs: undefined,
          content: IdlTypeFlat.option({
            prefix: IdlTypePrefix.u8,
            content: IdlTypeFlat.primitive(IdlTypePrimitive.u8),
          }),
        },
        {
          docs: undefined,
          content: IdlTypeFlat.option({
            prefix: IdlTypePrefix.u32,
            content: IdlTypeFlat.primitive(IdlTypePrimitive.u8),
          }),
        },
        {
          docs: ["Hello"],
          content: IdlTypeFlat.structNothing(),
        },
      ]),
    }),
  });
});
