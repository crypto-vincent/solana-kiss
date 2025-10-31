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
        discriminator: [18],
        fields: [
          { name: "bytes", loop: { items: "u8", until: 0 } },
          { name: "strings", loop: { items: "string", until: "dudu" } },
          {
            name: "objects",
            loop: {
              items: {
                fields: [
                  { name: "x", type: "u8" },
                  { name: "y", type: "u8" },
                ],
              },
              until: { x: 0, y: 0 },
            },
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
  };
  const accountData = idlAccountEncode(accountIdl, accountState);
  expect(accountData).toStrictEqual(
    new Uint8Array([
      18, 10, 20, 30, 0, 5, 0, 0, 0, 104, 101, 108, 108, 111, 5, 0, 0, 0, 119,
      111, 114, 108, 100, 4, 0, 0, 0, 100, 117, 100, 117, 42, 0, 7, 13, 0, 43,
      0, 0,
    ]),
  );
  expect(idlAccountDecode(accountIdl, accountData)).toStrictEqual(accountState);
});
