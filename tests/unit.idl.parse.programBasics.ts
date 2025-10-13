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
  // Create IDLs on the fly
  const programIdl1 = idlProgramParse({
    instructions: {
      my_ix: {
        docs: ["my ix doc"],
        accounts: [
          { name: "authority", signer: true },
          { name: "content", writable: true },
          { name: "optional", optional: true },
        ],
        args: [
          { name: "index", type: "u32" },
          { name: "id", type: "i64" },
        ],
      },
    },
    accounts: {
      MyAccount: {
        docs: ["My Account doc"],
        fields: [
          { name: "field1", type: "u64" },
          { name: "field2", type: "u32" },
        ],
      },
    },
    errors: {
      MyError: {
        code: 4242,
        msg: "My error message",
      },
    },
    events: {
      MyEvent: {
        fields: [
          { name: "field1", type: "u64", index: false },
          { name: "field2", type: "u32", index: true },
        ],
      },
    },
    constants: {
      MY_CONSTANT: {
        docs: ["My constant doc"],
        type: ["u32"],
        value: "[420_420, 69.069_0]",
      },
    },
  });
  const programIdl2 = idlProgramParse({
    instructions: [
      {
        name: "my_ix",
        docs: ["my ix doc"],
        accounts: [
          { name: "authority", isSigner: true },
          { name: "content", isMut: true },
          { name: "optional", isOptional: true },
        ],
        args: [
          { name: "index", type: "u32" },
          { name: "id", type: "i64" },
        ],
      },
    ],
    accounts: [
      {
        name: "MyAccount",
        docs: ["My Account doc"],
        type: {
          kind: "struct",
          fields: [
            { name: "field1", type: "u64" },
            { name: "field2", type: "u32" },
          ],
        },
      },
    ],
    events: [
      {
        name: "MyEvent",
        fields: [
          { name: "field1", type: "u64", index: false },
          { name: "field2", type: "u32", index: true },
        ],
      },
    ],
    errors: [
      {
        code: 4242,
        name: "MyError",
        msg: "My error message",
      },
    ],
    constants: [
      {
        name: "MY_CONSTANT",
        docs: ["My constant doc"],
        type: ["u32"],
        value: "[420_420, 69.069_0]",
      },
    ],
  });
  // Assert that both versions are equivalent
  expect(programIdl1).toStrictEqual(programIdl2);
  // Assert instruction was parsed correctly
  expect(programIdl1.instructions.get("my_ix")).toStrictEqual({
    name: "my_ix",
    docs: ["my ix doc"],
    discriminator: new Uint8Array([38, 19, 70, 194, 0, 59, 80, 114]),
    accounts: [
      {
        name: "authority",
        docs: undefined,
        writable: false,
        signer: true,
        optional: false,
        address: undefined,
        pda: undefined,
      },
      {
        name: "content",
        docs: undefined,
        writable: true,
        signer: false,
        optional: false,
        address: undefined,
        pda: undefined,
      },
      {
        name: "optional",
        docs: undefined,
        writable: false,
        signer: false,
        optional: true,
        address: undefined,
        pda: undefined,
      },
    ],
    args: {
      typeFlatFields: IdlTypeFlatFields.named([
        {
          name: "index",
          docs: undefined,
          content: IdlTypeFlat.primitive(IdlTypePrimitive.u32),
        },
        {
          name: "id",
          docs: undefined,
          content: IdlTypeFlat.primitive(IdlTypePrimitive.i64),
        },
      ]),
      typeFullFields: IdlTypeFullFields.named([
        {
          name: "index",
          content: IdlTypeFull.primitive(IdlTypePrimitive.u32),
        },
        {
          name: "id",
          content: IdlTypeFull.primitive(IdlTypePrimitive.i64),
        },
      ]),
    },
    return: {
      typeFlat: IdlTypeFlat.structNothing(),
      typeFull: IdlTypeFull.structNothing(),
    },
  });
  // Assert account was parsed correctly
  expect(programIdl1.accounts.get("MyAccount")).toStrictEqual({
    name: "MyAccount",
    docs: ["My Account doc"],
    space: undefined,
    blobs: [],
    discriminator: new Uint8Array([246, 28, 6, 87, 251, 45, 50, 42]),
    typeFlat: IdlTypeFlat.struct({
      fields: IdlTypeFlatFields.named([
        {
          name: "field1",
          docs: undefined,
          content: IdlTypeFlat.primitive(IdlTypePrimitive.u64),
        },
        {
          name: "field2",
          docs: undefined,
          content: IdlTypeFlat.primitive(IdlTypePrimitive.u32),
        },
      ]),
    }),
    typeFull: IdlTypeFull.struct({
      fields: IdlTypeFullFields.named([
        {
          name: "field1",
          content: IdlTypeFull.primitive(IdlTypePrimitive.u64),
        },
        {
          name: "field2",
          content: IdlTypeFull.primitive(IdlTypePrimitive.u32),
        },
      ]),
    }),
  });
  // Assert event was parsed correctly
  expect(programIdl1.events.get("MyEvent")).toStrictEqual({
    name: "MyEvent",
    docs: undefined,
    discriminator: new Uint8Array([96, 184, 197, 243, 139, 2, 90, 148]),
    typeFlat: IdlTypeFlat.struct({
      fields: IdlTypeFlatFields.named([
        {
          name: "field1",
          docs: undefined,
          content: IdlTypeFlat.primitive(IdlTypePrimitive.u64),
        },
        {
          name: "field2",
          docs: undefined,
          content: IdlTypeFlat.primitive(IdlTypePrimitive.u32),
        },
      ]),
    }),
    typeFull: IdlTypeFull.struct({
      fields: IdlTypeFullFields.named([
        {
          name: "field1",
          content: IdlTypeFull.primitive(IdlTypePrimitive.u64),
        },
        {
          name: "field2",
          content: IdlTypeFull.primitive(IdlTypePrimitive.u32),
        },
      ]),
    }),
  });
  // Assert error was parsed correctly
  expect(programIdl1.errors.get("MyError")).toStrictEqual({
    name: "MyError",
    docs: undefined,
    code: 4242,
    msg: "My error message",
  });
  // Assert constant was parsed correctly
  expect(programIdl1.constants.get("MY_CONSTANT")).toStrictEqual({
    name: "MY_CONSTANT",
    docs: ["My constant doc"],
    value: [420_420, 69.069_0],
    typeFlat: IdlTypeFlat.vec({
      prefix: IdlTypePrefix.u32,
      items: IdlTypeFlat.primitive(IdlTypePrimitive.u32),
    }),
    typeFull: IdlTypeFull.vec({
      prefix: IdlTypePrefix.u32,
      items: IdlTypeFull.primitive(IdlTypePrimitive.u32),
    }),
  });
});
