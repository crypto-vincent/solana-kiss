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
          { name: "u8s", loop: { items: "u8", until: 0 } },
          { name: "strings", loop: { items: "string", until: "dudu" } },
        ],
      },
    },
  });
  // Check that we can use the manual IDL to encode/decode our account in different ways
  const accountIdl = expectDefined(programIdl.accounts.get("MyAccount"));
  const accountState = {
    u8s: [10, 20, 30],
    strings: ["hello", "world"],
  };
  const accountData = idlAccountEncode(accountIdl, accountState);
  expect(accountData).toStrictEqual(
    new Uint8Array([
      18, 10, 20, 30, 0, 5, 0, 0, 0, 104, 101, 108, 108, 111, 5, 0, 0, 0, 119,
      111, 114, 108, 100, 4, 0, 0, 0, 100, 117, 100, 117,
    ]),
  );
  expect(idlAccountDecode(accountIdl, accountData)).toStrictEqual(accountState);
});
