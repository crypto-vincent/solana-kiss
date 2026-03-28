import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlAccountDecode,
  idlAccountEncode,
  idlProgramParse,
} from "../src";

it("run", () => {
  // TODO - make a proper test for "first" types
  // Create an IDL on the fly
  const programIdl = idlProgramParse({
    accounts: {
      MyAccount: {
        discriminator: [18],
        fields: [
          {
            name: "part1",
            first: [
              { fields: [] },
              { name: "v1", fields: {} },
              { name: "v2", fields: [{ name: "x", type: "u64" }] },
            ],
          },
          {
            name: "part2",
            first: [
              { fields: [] },
              { name: "v1", fields: {} },
              { name: "v2", fields: [{ name: "x", type: "u64" }] },
            ],
          },
        ],
      },
    },
  });
  // Check that we can use the manual IDL to encode/decode our account in different ways
  const accountIdl = expectDefined(programIdl.accounts.get("MyAccount"));
  const accountState = {
    bytes: [10, 20, 30],
    strings: ["hello", "world"],
    objects: [
      { x: 42, y: 0 },
      { x: 7, y: 13 },
      { x: 0, y: 43 },
    ],
    rest: [
      { name: 77, code: 87 },
      { name: 78, code: 88 },
      { name: 79, code: 89 },
    ],
  };
  const { accountData } = idlAccountEncode(accountIdl, accountState);
  expect(accountData).toStrictEqual(
    new Uint8Array([
      18, 10, 20, 30, 0, 5, 0, 0, 0, 104, 101, 108, 108, 111, 5, 0, 0, 0, 119,
      111, 114, 108, 100, 4, 0, 0, 0, 100, 117, 100, 117, 42, 0, 7, 13, 0, 43,
      0, 0, 77, 87, 78, 88, 79, 89,
    ]),
  );
  expect(idlAccountDecode(accountIdl, accountData).accountState).toStrictEqual(
    accountState,
  );
});
