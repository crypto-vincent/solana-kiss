import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlAccountDecode,
  idlAccountEncode,
  idlProgramParse,
} from "../src";

it("run", () => {
  // Create an IDL on the fly
  const programIdl = idlProgramParse({
    accounts: {
      MyAccount: {
        discriminator: [77, 78],
        fields: ["MyEnum", "MyEnum", "MyEnum", "MyEnum", "MyEnum"],
      },
    },
    types: {
      MyEnum: {
        variants128: [
          {
            name: "Named",
            fields: [{ name: "field1", type: "u32" }],
          },
          {
            name: "Unnamed",
            code: 99,
            fields: ["u8", "u8"],
          },
          {
            name: "Empty",
          },
          "Shortened",
          {
            name: "BigCode",
            code: 0xffffffffffffffffffffffffffffffffn.toString(),
          },
        ],
      },
    },
  });
  // MyAccount info
  const accountIdl = expectDefined(programIdl.accounts.get("MyAccount"));
  const accountState1 = [
    "Empty",
    { Named: { field1: 42 } },
    { Unnamed: [22, 23] },
    "Shortened",
    "BigCode",
  ];
  const accountState2 = [
    2,
    { 0: { field1: 42 } },
    { 99: [22, 23] },
    3,
    0xffffffffffffffffffffffffffffffffn.toString(),
  ];
  // Check that we can use the manual IDL to encode/decode our account
  const { accountData: accountData1 } = idlAccountEncode(
    accountIdl,
    accountState1,
  );
  const { accountData: accountData2 } = idlAccountEncode(
    accountIdl,
    accountState2,
  );
  expect(accountData2).toStrictEqual(accountData1);
  expect(accountData1).toStrictEqual(
    new Uint8Array(
      [
        [77, 78],
        [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [42, 0, 0, 0],
        [99, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [22, 23],
        [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [],
        [ff, ff, ff, ff, ff, ff, ff, ff, ff, ff, ff, ff, ff, ff, ff, ff],
        [],
      ].flat(),
    ),
  );
  expect(idlAccountDecode(accountIdl, accountData1).accountState).toStrictEqual(
    accountState1,
  );
});

const ff = 0xff;
