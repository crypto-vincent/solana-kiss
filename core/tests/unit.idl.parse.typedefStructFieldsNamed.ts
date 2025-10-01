import { idlProgramParse } from "../src/idl/IdlProgram";
import { IdlTypeFlat, IdlTypeFlatFields } from "../src/idl/IdlTypeFlat";
import { IdlTypePrefix } from "../src/idl/IdlTypePrefix";
import { IdlTypePrimitive } from "../src/idl/IdlTypePrimitive";

it("run", () => {
  // Create IDL on the fly
  const programIdl = idlProgramParse({
    types: {
      MyStruct: {
        fields: [
          { name: "u8", type: "u8" },
          { name: "u64", type: "u64" },
          { name: "string", type: "string" },
          { name: "vec1_u8", type: ["u8"] },
          { name: "vec2_u8", type: { vec: "u8" } },
          { name: "vec1_vec_u8", type: [["u8"]] },
          { name: "vec2_vec_u8", type: [{ vec: "u8" }] },
          { name: "array1_u32_4", type: ["u32", 4] },
          { name: "array2_u32_4", type: { array: ["u32", 4] } },
          { name: "struct1", type: { fields: [] } },
          { name: "struct2", fields: [] },
          { name: "enum1", type: { variants: [] } },
          { name: "enum2", variants: [] },
          { name: "defined1", defined: "Other" },
          { name: "defined2", defined: { name: "Other" } },
          { name: "defined3", type: { defined: "Other" } },
          { name: "defined4", type: { defined: { name: "Other" } } },
          { name: "option1_f32", option: "f32" },
          { name: "option2_f32", type: { option: "f32" } },
          { name: "generic1", generic: "G" },
          { name: "generic2", type: { generic: "G" } },
          { name: "docs", type: "u8", docs: ["Hello"] },
        ],
      },
    },
  });
  // Assert that the content is correct
  expect(programIdl.typedefs.get("MyStruct")).toStrictEqual({
    name: "MyStruct",
    docs: undefined,
    serialization: undefined,
    repr: undefined,
    generics: [],
    typeFlat: IdlTypeFlat.struct({
      fields: IdlTypeFlatFields.named([
        {
          name: "u8",
          docs: undefined,
          content: IdlTypeFlat.primitive(IdlTypePrimitive.U8),
        },
        {
          name: "u64",
          docs: undefined,
          content: IdlTypeFlat.primitive(IdlTypePrimitive.U64),
        },
        {
          name: "string",
          docs: undefined,
          content: IdlTypeFlat.string({
            prefix: IdlTypePrefix.U32,
          }),
        },
        {
          name: "vec1_u8",
          docs: undefined,
          content: IdlTypeFlat.vec({
            prefix: IdlTypePrefix.U32,
            items: IdlTypeFlat.primitive(IdlTypePrimitive.U8),
          }),
        },
        {
          name: "vec2_u8",
          docs: undefined,
          content: IdlTypeFlat.vec({
            prefix: IdlTypePrefix.U32,
            items: IdlTypeFlat.primitive(IdlTypePrimitive.U8),
          }),
        },
        {
          name: "vec1_vec_u8",
          docs: undefined,
          content: IdlTypeFlat.vec({
            prefix: IdlTypePrefix.U32,
            items: IdlTypeFlat.vec({
              prefix: IdlTypePrefix.U32,
              items: IdlTypeFlat.primitive(IdlTypePrimitive.U8),
            }),
          }),
        },
        {
          name: "vec2_vec_u8",
          docs: undefined,
          content: IdlTypeFlat.vec({
            prefix: IdlTypePrefix.U32,
            items: IdlTypeFlat.vec({
              prefix: IdlTypePrefix.U32,
              items: IdlTypeFlat.primitive(IdlTypePrimitive.U8),
            }),
          }),
        },
        {
          name: "array1_u32_4",
          docs: undefined,
          content: IdlTypeFlat.array({
            items: IdlTypeFlat.primitive(IdlTypePrimitive.U32),
            length: IdlTypeFlat.const({ literal: 4 }),
          }),
        },
        {
          name: "array2_u32_4",
          docs: undefined,
          content: IdlTypeFlat.array({
            items: IdlTypeFlat.primitive(IdlTypePrimitive.U32),
            length: IdlTypeFlat.const({ literal: 4 }),
          }),
        },
        {
          name: "struct1",
          docs: undefined,
          content: IdlTypeFlat.structNothing(),
        },
        {
          name: "struct2",
          docs: undefined,
          content: IdlTypeFlat.structNothing(),
        },
        {
          name: "enum1",
          docs: undefined,
          content: IdlTypeFlat.enum({
            prefix: IdlTypePrefix.U8,
            variants: [],
          }),
        },
        {
          name: "enum2",
          docs: undefined,
          content: IdlTypeFlat.enum({
            prefix: IdlTypePrefix.U8,
            variants: [],
          }),
        },
        {
          name: "defined1",
          docs: undefined,
          content: IdlTypeFlat.defined({
            name: "Other",
            generics: [],
          }),
        },
        {
          name: "defined2",
          docs: undefined,
          content: IdlTypeFlat.defined({
            name: "Other",
            generics: [],
          }),
        },
        {
          name: "defined3",
          docs: undefined,
          content: IdlTypeFlat.defined({
            name: "Other",
            generics: [],
          }),
        },
        {
          name: "defined4",
          docs: undefined,
          content: IdlTypeFlat.defined({
            name: "Other",
            generics: [],
          }),
        },
        {
          name: "option1_f32",
          docs: undefined,
          content: IdlTypeFlat.option({
            prefix: IdlTypePrefix.U8,
            content: IdlTypeFlat.primitive(IdlTypePrimitive.F32),
          }),
        },
        {
          name: "option2_f32",
          docs: undefined,
          content: IdlTypeFlat.option({
            prefix: IdlTypePrefix.U8,
            content: IdlTypeFlat.primitive(IdlTypePrimitive.F32),
          }),
        },
        {
          name: "generic1",
          docs: undefined,
          content: IdlTypeFlat.generic({
            symbol: "G",
          }),
        },
        {
          name: "generic2",
          docs: undefined,
          content: IdlTypeFlat.generic({
            symbol: "G",
          }),
        },
        {
          name: "docs",
          docs: ["Hello"],
          content: IdlTypeFlat.primitive(IdlTypePrimitive.U8),
        },
      ]),
    }),
  });
});
