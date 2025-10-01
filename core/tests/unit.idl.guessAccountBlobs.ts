import {
  idlProgramGuessAccount,
  idlProgramParse,
  IdlTypeFlat,
  IdlTypeFull,
} from "../src";

it("run", () => {
  // Create IDL on the fly
  const programIdl = idlProgramParse({
    accounts: {
      MyAccount1_x3: {
        blobs: [
          {
            offset: 1,
            value: [2, 3],
          },
        ],
        discriminator: [1],
        fields: [],
      },
      MyAccount1_x6: {
        blobs: [
          {
            offset: 5,
            value: [6],
          },
        ],
        discriminator: [1],
        fields: [],
      },
      MyAccount2_x6: {
        blobs: [
          {
            offset: 1,
            value: [2, 2, 2],
          },
          {
            offset: 5,
            value: [2],
          },
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
  // Verify known accounts
  expect(programIdl.accounts.get("MyAccount1_x3")).toStrictEqual({
    name: "MyAccount1_x3",
    docs: undefined,
    space: undefined,
    blobs: [{ offset: 1, value: new Uint8Array([2, 3]) }],
    discriminator: new Uint8Array([1]),
    contentTypeFlat: IdlTypeFlat.structNothing(),
    contentTypeFull: IdlTypeFull.structNothing(),
  });
  expect(programIdl.accounts.get("MyAccount1_x6")).toStrictEqual({
    name: "MyAccount1_x6",
    docs: undefined,
    space: undefined,
    blobs: [{ offset: 5, value: new Uint8Array([6]) }],
    discriminator: new Uint8Array([1]),
    contentTypeFlat: IdlTypeFlat.structNothing(),
    contentTypeFull: IdlTypeFull.structNothing(),
  });
  expect(programIdl.accounts.get("MyAccount2_x6")).toStrictEqual({
    name: "MyAccount2_x6",
    docs: undefined,
    space: undefined,
    blobs: [
      { offset: 1, value: new Uint8Array([2, 2, 2]) },
      { offset: 5, value: new Uint8Array([2]) },
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
    idlProgramGuessAccount(programIdl, new Uint8Array([1, 2, 3])),
  ).toStrictEqual(programIdl.accounts.get("MyAccount1_x3"));
  expect(
    idlProgramGuessAccount(programIdl, new Uint8Array([1, 2, 3, 9, 9, 9])),
  ).toStrictEqual(programIdl.accounts.get("MyAccount1_x3"));
  expect(
    idlProgramGuessAccount(programIdl, new Uint8Array([1, 9, 9, 9, 9, 6])),
  ).toStrictEqual(programIdl.accounts.get("MyAccount1_x6"));
  expect(
    idlProgramGuessAccount(programIdl, new Uint8Array([2, 2, 2, 2, 2, 2])),
  ).toStrictEqual(programIdl.accounts.get("MyAccount2_x6"));
  expect(
    idlProgramGuessAccount(programIdl, new Uint8Array([2, 2, 2, 2, 9, 2])),
  ).toStrictEqual(programIdl.accounts.get("MyAccount2_x6"));
  expect(
    idlProgramGuessAccount(
      programIdl,
      new Uint8Array([2, 2, 2, 2, 9, 2, 9, 9]),
    ),
  ).toStrictEqual(programIdl.accounts.get("MyAccount2_x6"));
  expect(
    idlProgramGuessAccount(programIdl, new Uint8Array([1, 2, 9])),
  ).toStrictEqual(undefined);
  expect(
    idlProgramGuessAccount(programIdl, new Uint8Array([1, 9, 3])),
  ).toStrictEqual(undefined);
  expect(
    idlProgramGuessAccount(programIdl, new Uint8Array([2, 2, 9, 2, 2, 2])),
  ).toStrictEqual(undefined);
  expect(
    idlProgramGuessAccount(programIdl, new Uint8Array([2, 2, 2, 9, 2, 2])),
  ).toStrictEqual(undefined);
});
