import { expect, it } from "@jest/globals";
import {
  idlProgramParse,
  IdlTypeFlat,
  IdlTypeFlatFields,
  IdlTypeFull,
  IdlTypeFullFields,
  IdlTypePrefix,
  IdlTypePrimitive,
} from "../src";

it("run", () => {
  // Create IDLs using different shortened formats
  const programIdl = idlProgramParse({
    accounts: {
      MyAccount: {
        discriminator: [77],
        fields: [
          {
            defined: {
              name: "MyDefinedEnum",
              generics: ["u8"],
            },
          },
          {
            defined: {
              name: "MyDefinedStruct",
              generics: ["f32", "f64"],
            },
          },
          {
            defined: {
              name: "MyArray",
              generics: ["i8", 4],
            },
          },
        ],
      },
    },
    types: {
      MyDefinedEnum: {
        generics: ["D"],
        defined: {
          name: "MyEnum",
          generics: [[{ generic: "D" }], { generic: "D" }],
        },
      },
      MyDefinedStruct: {
        generics: ["D", "E"],
        defined: {
          name: "MyStruct",
          generics: [{ option: { generic: "E" } }, [{ generic: "D" }]],
        },
      },
      MyEnum: {
        generics: ["A", "B"],
        variants: [
          { name: "CaseA", fields: [{ generic: "A" }] },
          { name: "CaseB", fields: [{ generic: "B" }] },
        ],
      },
      MyStruct: {
        generics: ["A", "B"],
        fields: [
          { name: "field_a", generic: "A" },
          { name: "field_b", generic: "B" },
        ],
      },
      MyArray: {
        generics: ["C", "L"],
        type: [{ generic: "C" }, { generic: "L" }],
      },
    },
  });
  // Assert that the content is correct
  expect(programIdl.accounts.get("MyAccount")).toStrictEqual({
    name: "MyAccount",
    docs: undefined,
    discriminator: new Uint8Array([77]),
    dataSpace: undefined,
    dataBlobs: [{ offset: 0, bytes: new Uint8Array([77]) }],
    typeFlat: IdlTypeFlat.struct({
      fields: IdlTypeFlatFields.unnamed([
        {
          docs: undefined,
          content: IdlTypeFlat.defined({
            name: "MyDefinedEnum",
            generics: [IdlTypeFlat.primitive(IdlTypePrimitive.u8)],
          }),
        },
        {
          docs: undefined,
          content: IdlTypeFlat.defined({
            name: "MyDefinedStruct",
            generics: [
              IdlTypeFlat.primitive(IdlTypePrimitive.f32),
              IdlTypeFlat.primitive(IdlTypePrimitive.f64),
            ],
          }),
        },
        {
          docs: undefined,
          content: IdlTypeFlat.defined({
            name: "MyArray",
            generics: [
              IdlTypeFlat.primitive(IdlTypePrimitive.i8),
              IdlTypeFlat.const({ literal: 4 }),
            ],
          }),
        },
      ]),
    }),
    typeFull: IdlTypeFull.struct({
      fields: IdlTypeFullFields.unnamed([
        {
          position: 0,
          content: IdlTypeFull.typedef({
            name: "MyDefinedEnum",
            repr: undefined,
            content: IdlTypeFull.typedef({
              name: "MyEnum",
              repr: undefined,
              content: IdlTypeFull.enum({
                prefix: IdlTypePrefix.u8,
                mask: 1n,
                indexByName: new Map([
                  ["CaseA", 0],
                  ["CaseB", 1],
                ]),
                indexByCodeBigInt: new Map([
                  [0n, 0],
                  [1n, 1],
                ]),
                indexByCodeString: new Map([
                  ["0", 0],
                  ["1", 1],
                ]),
                variants: [
                  {
                    name: "CaseA",
                    code: 0n,
                    fields: IdlTypeFullFields.unnamed([
                      {
                        position: 0,
                        content: IdlTypeFull.vec({
                          prefix: IdlTypePrefix.u32,
                          items: IdlTypeFull.primitive(IdlTypePrimitive.u8),
                        }),
                      },
                    ]),
                  },
                  {
                    name: "CaseB",
                    code: 1n,
                    fields: IdlTypeFullFields.unnamed([
                      {
                        position: 0,
                        content: IdlTypeFull.primitive(IdlTypePrimitive.u8),
                      },
                    ]),
                  },
                ],
              }),
            }),
          }),
        },
        {
          position: 1,
          content: IdlTypeFull.typedef({
            name: "MyDefinedStruct",
            repr: undefined,
            content: IdlTypeFull.typedef({
              name: "MyStruct",
              repr: undefined,
              content: IdlTypeFull.struct({
                fields: IdlTypeFullFields.named([
                  {
                    name: "field_a",
                    content: IdlTypeFull.option({
                      prefix: IdlTypePrefix.u8,
                      content: IdlTypeFull.primitive(IdlTypePrimitive.f64),
                    }),
                  },
                  {
                    name: "field_b",
                    content: IdlTypeFull.vec({
                      prefix: IdlTypePrefix.u32,
                      items: IdlTypeFull.primitive(IdlTypePrimitive.f32),
                    }),
                  },
                ]),
              }),
            }),
          }),
        },
        {
          position: 2,
          content: IdlTypeFull.typedef({
            name: "MyArray",
            repr: undefined,
            content: IdlTypeFull.array({
              items: IdlTypeFull.primitive(IdlTypePrimitive.i8),
              length: 4,
            }),
          }),
        },
      ]),
    }),
  });
});
