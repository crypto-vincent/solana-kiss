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
        space: 3,
        discriminator: [1],
        fields: [],
      },
      MyAccount1_x6: {
        space: 6,
        discriminator: [1],
        fields: [],
      },
      MyAccount2_x6: {
        space: 6,
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
    space: 3,
    blobs: [],
    discriminator: new Uint8Array([1]),
    contentTypeFlat: IdlTypeFlat.structNothing(),
    contentTypeFull: IdlTypeFull.structNothing(),
  });
  expect(programIdl.accounts.get("MyAccount1_x6")).toStrictEqual({
    name: "MyAccount1_x6",
    docs: undefined,
    space: 6,
    blobs: [],
    discriminator: new Uint8Array([1]),
    contentTypeFlat: IdlTypeFlat.structNothing(),
    contentTypeFull: IdlTypeFull.structNothing(),
  });
  expect(programIdl.accounts.get("MyAccount2_x6")).toStrictEqual({
    name: "MyAccount2_x6",
    docs: undefined,
    space: 6,
    blobs: [],
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
    idlProgramGuessAccount(programIdl, new Uint8Array([1, 9, 9])),
  ).toStrictEqual(programIdl.accounts.get("MyAccount1_x3"));
  expect(
    idlProgramGuessAccount(programIdl, new Uint8Array([1, 2, 3, 4, 5, 6])),
  ).toStrictEqual(programIdl.accounts.get("MyAccount1_x6"));
  expect(
    idlProgramGuessAccount(programIdl, new Uint8Array([1, 9, 9, 9, 9, 9])),
  ).toStrictEqual(programIdl.accounts.get("MyAccount1_x6"));
  expect(
    idlProgramGuessAccount(programIdl, new Uint8Array([2, 2, 2, 2, 2, 2])),
  ).toStrictEqual(programIdl.accounts.get("MyAccount2_x6"));
  expect(
    idlProgramGuessAccount(programIdl, new Uint8Array([2, 9, 9, 9, 9, 9])),
  ).toStrictEqual(programIdl.accounts.get("MyAccount2_x6"));
  expect(
    idlProgramGuessAccount(programIdl, new Uint8Array([1, 2])),
  ).toStrictEqual(undefined);
  expect(
    idlProgramGuessAccount(programIdl, new Uint8Array([1, 2, 3, 4])),
  ).toStrictEqual(undefined);
  expect(
    idlProgramGuessAccount(
      programIdl,
      new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
    ),
  ).toStrictEqual(undefined);
  expect(
    idlProgramGuessAccount(programIdl, new Uint8Array([2, 2, 2])),
  ).toStrictEqual(undefined);
  expect(
    idlProgramGuessAccount(
      programIdl,
      new Uint8Array([2, 2, 2, 2, 2, 2, 2, 2]),
    ),
  ).toStrictEqual(undefined);
});
