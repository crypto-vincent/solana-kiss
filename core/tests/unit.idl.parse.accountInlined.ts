import { idlProgramParse, IdlTypeFlat, IdlTypeFull } from "../src";

it("run", () => {
  // Create IDLs using different shortened formats
  const programIdl1 = idlProgramParse({
    accounts: [
      {
        name: "MyAccount",
        discriminator: [246, 28, 6, 87, 251, 45, 50, 42],
        type: { fields: [] },
      },
    ],
  });
  const programIdl2 = idlProgramParse({
    accounts: [
      {
        name: "MyAccount",
        type: { fields: [] },
      },
    ],
  });
  const programIdl3 = idlProgramParse({
    accounts: [
      {
        name: "MyAccount",
        discriminator: [246, 28, 6, 87, 251, 45, 50, 42],
        fields: [],
      },
    ],
  });
  const programIdl4 = idlProgramParse({
    accounts: [
      {
        name: "MyAccount",
        fields: [],
      },
    ],
  });
  const programIdl5 = idlProgramParse({
    accounts: {
      MyAccount: {
        discriminator: [246, 28, 6, 87, 251, 45, 50, 42],
        type: { fields: [] },
      },
    },
  });
  const programIdl6 = idlProgramParse({
    accounts: {
      MyAccount: {
        type: { fields: [] },
      },
    },
  });
  const programIdl7 = idlProgramParse({
    accounts: {
      MyAccount: {
        discriminator: [246, 28, 6, 87, 251, 45, 50, 42],
        fields: [],
      },
    },
  });
  const programIdl8 = idlProgramParse({
    accounts: {
      MyAccount: { fields: [] },
    },
  });
  // Assert that all are equivalent
  expect(programIdl1).toStrictEqual(programIdl2);
  expect(programIdl1).toStrictEqual(programIdl3);
  expect(programIdl1).toStrictEqual(programIdl4);
  expect(programIdl1).toStrictEqual(programIdl5);
  expect(programIdl1).toStrictEqual(programIdl6);
  expect(programIdl1).toStrictEqual(programIdl7);
  expect(programIdl1).toStrictEqual(programIdl8);
  // Assert that the content is correct
  expect(programIdl1.accounts.get("MyAccount")).toStrictEqual({
    name: "MyAccount",
    docs: undefined,
    space: undefined,
    blobs: [],
    discriminator: new Uint8Array([246, 28, 6, 87, 251, 45, 50, 42]),
    contentTypeFlat: IdlTypeFlat.structNothing(),
    contentTypeFull: IdlTypeFull.structNothing(),
  });
});
