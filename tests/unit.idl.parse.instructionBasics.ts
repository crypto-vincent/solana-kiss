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
  const programIdl1 = idlProgramParse({
    instructions: [
      {
        name: "my_ix",
        discriminator: [38, 19, 70, 194, 0, 59, 80, 114],
        accounts: [
          { name: "account_ws", signer: true, writable: true },
          { name: "account_rs", signer: true, writable: false },
          { name: "account_w", signer: false, writable: true },
          { name: "account_r", signer: false, writable: false },
          {
            name: "nester",
            accounts: [
              { name: "nested_a" },
              { name: "nested", accounts: [{ name: "b" }] },
            ],
          },
        ],
        args: [{ name: "arg", type: { vec: "u8" } }],
        returns: "i8",
      },
    ],
  });
  const programIdl2 = idlProgramParse({
    instructions: [
      {
        name: "my_ix",
        accounts: [
          { name: "account_ws", signer: true, writable: true },
          { name: "account_rs", signer: true },
          { name: "account_w", writable: true },
          { name: "account_r" },
          {
            name: "nester",
            accounts: [
              { name: "nested_a" },
              { name: "nested", accounts: [{ name: "b" }] },
            ],
          },
        ],
        args: [{ name: "arg", type: { vec: "u8" } }],
        returns: "i8",
      },
    ],
  });
  const programIdl3 = idlProgramParse({
    instructions: {
      my_ix: {
        discriminator: [38, 19, 70, 194, 0, 59, 80, 114],
        accounts: [
          { name: "account_ws", isSigner: true, isMut: true },
          { name: "account_rs", isSigner: true },
          { name: "account_w", isMut: true },
          { name: "account_r" },
          {
            name: "nester",
            accounts: [
              { name: "nested_a" },
              { name: "nested", accounts: [{ name: "b" }] },
            ],
          },
        ],
        args: [{ name: "arg", vec: "u8" }],
        returns: "i8",
      },
    },
  });
  const programIdl4 = idlProgramParse({
    instructions: {
      my_ix: {
        accounts: [
          { name: "account_ws", isSigner: true, isMut: true },
          { name: "account_rs", isSigner: true },
          { name: "account_w", isMut: true },
          { name: "account_r" },
          {
            name: "nester",
            accounts: [
              { name: "nested_a" },
              { name: "nested", accounts: [{ name: "b" }] },
            ],
          },
        ],
        args: [{ name: "arg", vec: "u8" }],
        returns: "i8",
      },
    },
  });
  // Assert that all are equivalent
  expect(programIdl1).toStrictEqual(programIdl2);
  expect(programIdl1).toStrictEqual(programIdl3);
  expect(programIdl1).toStrictEqual(programIdl4);
  // Assert that the content is correct
  expect(programIdl1.instructions.get("my_ix")).toStrictEqual({
    name: "my_ix",
    docs: undefined,
    discriminator: new Uint8Array([38, 19, 70, 194, 0, 59, 80, 114]),
    accounts: [
      {
        name: "account_ws",
        docs: undefined,
        writable: true,
        signer: true,
        optional: false,
        address: undefined,
        pda: undefined,
      },
      {
        name: "account_rs",
        docs: undefined,
        writable: false,
        signer: true,
        optional: false,
        address: undefined,
        pda: undefined,
      },
      {
        name: "account_w",
        docs: undefined,
        writable: true,
        signer: false,
        optional: false,
        address: undefined,
        pda: undefined,
      },
      {
        name: "account_r",
        docs: undefined,
        writable: false,
        signer: false,
        optional: false,
        address: undefined,
        pda: undefined,
      },
      {
        name: "nester.nested_a",
        docs: undefined,
        writable: false,
        signer: false,
        optional: false,
        address: undefined,
        pda: undefined,
      },
      {
        name: "nester.nested.b",
        docs: undefined,
        writable: false,
        signer: false,
        optional: false,
        address: undefined,
        pda: undefined,
      },
    ],
    args: {
      typeFlatFields: IdlTypeFlatFields.named([
        {
          name: "arg",
          docs: undefined,
          content: IdlTypeFlat.vec({
            prefix: IdlTypePrefix.u32,
            items: IdlTypeFlat.primitive(IdlTypePrimitive.u8),
          }),
        },
      ]),
      typeFullFields: IdlTypeFullFields.named([
        {
          name: "arg",
          content: IdlTypeFull.vec({
            prefix: IdlTypePrefix.u32,
            items: IdlTypeFull.primitive(IdlTypePrimitive.u8),
          }),
        },
      ]),
    },
    return: {
      typeFlat: IdlTypeFlat.primitive(IdlTypePrimitive.i8),
      typeFull: IdlTypeFull.primitive(IdlTypePrimitive.i8),
    },
  });
});
