import { expect, it } from "@jest/globals";
import {
  idlProgramGuessAccount,
  idlProgramParse,
  IdlTypeFlat,
  IdlTypeFull,
} from "../src";

it("run", () => {
  // Create IDLs using different shortened formats
  const programIdl1 = idlProgramParse({
    accounts: {
      MyAccount1_x3: {
        blobs: [{ offset: 1, bytes: [2, 3] }],
        discriminator: [1],
        fields: [],
      },
      MyAccount1_x6: {
        blobs: [{ offset: 5, bytes: [6] }],
        discriminator: [1],
        fields: [],
      },
      MyAccount2_x6: {
        blobs: [
          { offset: 1, bytes: [2, 2, 2] },
          { offset: 5, bytes: [2] },
        ],
        discriminator: [2],
      },
    },
    types: {
      MyAccount2_x6: {
        fields: [],
      },
    },
  });
  const programIdl2 = idlProgramParse({
    accounts: {
      MyAccount1_x3: {
        blobs: [{ offset: 1, bytes: { encode: { value: 770, type: "u16" } } }],
        discriminator: { base16: "01" },
        fields: [],
      },
      MyAccount1_x6: {
        blobs: [{ offset: 5, bytes: { base16: "06" } }],
        discriminator: { base64: "AQ==" },
        fields: [],
      },
      MyAccount2_x6: {
        blobs: [
          { offset: 1, bytes: { base58: "g7j" } },
          { offset: 5, bytes: { encode: { type: "u8", value: 2 } } },
        ],
        discriminator: { encode: { type: "u8", value: 2 } },
      },
    },
    types: {
      MyAccount2_x6: {
        fields: [],
      },
    },
  });
  // Assert that all are equivalent
  expect(programIdl1).toStrictEqual(programIdl2);
  // Verify known accounts
  expect(programIdl1.accounts.get("MyAccount1_x3")).toStrictEqual({
    name: "MyAccount1_x3",
    docs: undefined,
    space: undefined,
    blobs: [{ offset: 1, bytes: new Uint8Array([2, 3]) }],
    discriminator: new Uint8Array([1]),
    contentTypeFlat: IdlTypeFlat.structNothing(),
    contentTypeFull: IdlTypeFull.structNothing(),
  });
  expect(programIdl1.accounts.get("MyAccount1_x6")).toStrictEqual({
    name: "MyAccount1_x6",
    docs: undefined,
    space: undefined,
    blobs: [{ offset: 5, bytes: new Uint8Array([6]) }],
    discriminator: new Uint8Array([1]),
    contentTypeFlat: IdlTypeFlat.structNothing(),
    contentTypeFull: IdlTypeFull.structNothing(),
  });
  expect(programIdl1.accounts.get("MyAccount2_x6")).toStrictEqual({
    name: "MyAccount2_x6",
    docs: undefined,
    space: undefined,
    blobs: [
      { offset: 1, bytes: new Uint8Array([2, 2, 2]) },
      { offset: 5, bytes: new Uint8Array([2]) },
    ],
    discriminator: new Uint8Array([2]),
    contentTypeFlat: IdlTypeFlat.defined({
      name: "MyAccount2_x6",
      generics: [],
    }),
    contentTypeFull: IdlTypeFull.typedef({
      name: "MyAccount2_x6",
      repr: undefined,
      content: IdlTypeFull.structNothing(),
    }),
  });
  // Check that we'll pick the right accounts depending on data
  expect(
    idlProgramGuessAccount(programIdl1, new Uint8Array([1, 2, 3])),
  ).toStrictEqual(programIdl1.accounts.get("MyAccount1_x3"));
  expect(
    idlProgramGuessAccount(programIdl1, new Uint8Array([1, 2, 3, 9, 9, 9])),
  ).toStrictEqual(programIdl1.accounts.get("MyAccount1_x3"));
  expect(
    idlProgramGuessAccount(programIdl1, new Uint8Array([1, 9, 9, 9, 9, 6])),
  ).toStrictEqual(programIdl1.accounts.get("MyAccount1_x6"));
  expect(
    idlProgramGuessAccount(programIdl1, new Uint8Array([2, 2, 2, 2, 2, 2])),
  ).toStrictEqual(programIdl1.accounts.get("MyAccount2_x6"));
  expect(
    idlProgramGuessAccount(programIdl1, new Uint8Array([2, 2, 2, 2, 9, 2])),
  ).toStrictEqual(programIdl1.accounts.get("MyAccount2_x6"));
  expect(
    idlProgramGuessAccount(
      programIdl1,
      new Uint8Array([2, 2, 2, 2, 9, 2, 9, 9]),
    ),
  ).toStrictEqual(programIdl1.accounts.get("MyAccount2_x6"));
  expect(
    idlProgramGuessAccount(programIdl1, new Uint8Array([1, 2, 9])),
  ).toStrictEqual(undefined);
  expect(
    idlProgramGuessAccount(programIdl1, new Uint8Array([1, 9, 3])),
  ).toStrictEqual(undefined);
  expect(
    idlProgramGuessAccount(programIdl1, new Uint8Array([2, 2, 9, 2, 2, 2])),
  ).toStrictEqual(undefined);
  expect(
    idlProgramGuessAccount(programIdl1, new Uint8Array([2, 2, 2, 9, 2, 2])),
  ).toStrictEqual(undefined);
});
