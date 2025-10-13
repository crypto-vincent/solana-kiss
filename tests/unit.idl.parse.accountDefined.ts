import { expect, it } from "@jest/globals";
import { idlProgramParse, IdlTypeFlat, IdlTypeFull } from "../src";

it("run", () => {
  // Create IDLs using different shortened formats
  const programIdl1 = idlProgramParse({
    accounts: [
      {
        name: "MyAccount",
        discriminator: [246, 28, 6, 87, 251, 45, 50, 42],
      },
    ],
    types: {
      MyAccount: { fields: [] },
    },
  });
  const programIdl2 = idlProgramParse({
    accounts: [
      {
        name: "MyAccount",
      },
    ],
    types: {
      MyAccount: { fields: [] },
    },
  });
  const programIdl3 = idlProgramParse({
    accounts: {
      MyAccount: {
        discriminator: [246, 28, 6, 87, 251, 45, 50, 42],
      },
    },
    types: {
      MyAccount: { fields: [] },
    },
  });
  const programIdl4 = idlProgramParse({
    accounts: {
      MyAccount: {},
    },
    types: {
      MyAccount: { fields: [] },
    },
  });
  // Assert that all are equivalent
  expect(programIdl1).toStrictEqual(programIdl2);
  expect(programIdl1).toStrictEqual(programIdl3);
  expect(programIdl1).toStrictEqual(programIdl4);
  // Assert that the content is correct
  expect(programIdl1.accounts.get("MyAccount")).toStrictEqual({
    name: "MyAccount",
    docs: undefined,
    space: undefined,
    blobs: [],
    discriminator: new Uint8Array([246, 28, 6, 87, 251, 45, 50, 42]),
    typeFlat: IdlTypeFlat.defined({
      name: "MyAccount",
      generics: [],
    }),
    typeFull: IdlTypeFull.typedef({
      name: "MyAccount",
      repr: undefined,
      content: IdlTypeFull.structNothing(),
    }),
  });
});
