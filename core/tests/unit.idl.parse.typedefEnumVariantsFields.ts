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
      MyEnum: {
        variants: [
          {
            name: "Named",
            fields: [
              { name: "f1", type: { defined: "Other" } },
              { name: "f2", type: { vec: "u8" } },
              { name: "f3", type: { generic: "G" } },
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
    types: {
      MyEnum: {
        variants: [
          {
            name: "Named",
            fields: [
              { name: "f1", defined: "Other" },
              { name: "f2", vec: "u8" },
              { name: "f3", generic: "G" },
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
  expect(programIdl1.typedefs.get("MyEnum")).toStrictEqual({
    name: "MyEnum",
    docs: undefined,
    serialization: undefined,
    repr: undefined,
    generics: [],
    typeFlat: IdlTypeFlat.enum({
      prefix: IdlTypePrefix.U8,
      variants: [
        {
          name: "Named",
          code: 0n,
          docs: undefined,
          fields: IdlTypeFlatFields.named([
            {
              docs: undefined,
              name: "f1",
              content: IdlTypeFlat.defined({
                name: "Other",
                generics: [],
              }),
            },
            {
              docs: undefined,
              name: "f2",
              content: IdlTypeFlat.vec({
                prefix: IdlTypePrefix.U32,
                items: IdlTypeFlat.primitive(IdlTypePrimitive.U8),
              }),
            },
            {
              docs: undefined,
              name: "f3",
              content: IdlTypeFlat.generic({
                symbol: "G",
              }),
            },
          ]),
        },
        {
          name: "Unnamed",
          code: 1n,
          docs: undefined,
          fields: IdlTypeFlatFields.unnamed([
            {
              docs: undefined,
              content: IdlTypeFlat.primitive(IdlTypePrimitive.U64),
            },
            {
              docs: undefined,
              content: IdlTypeFlat.vec({
                prefix: IdlTypePrefix.U32,
                items: IdlTypeFlat.primitive(IdlTypePrimitive.U8),
              }),
            },
            {
              docs: undefined,
              content: IdlTypeFlat.vec({
                prefix: IdlTypePrefix.U32,
                items: IdlTypeFlat.primitive(IdlTypePrimitive.U8),
              }),
            },
          ]),
        },
        {
          name: "Empty",
          code: 2n,
          docs: undefined,
          fields: IdlTypeFlatFields.nothing(),
        },
      ],
    }),
  });
});
