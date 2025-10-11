import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlAccountDecode,
  idlAccountEncode,
  idlProgramParse,
} from "../src";

it("run", () => {
  // Create IDLs using different shortened formats
  const programIdl1 = idlProgramParse({
    accounts: {
      MyAccount: {
        discriminator: [22],
        fields: [
          { name: "pad_before", padded: { before: 3, type: "u8" } },
          { name: "pad_size1", padded: { min_size: 3, type: ["u8", 2] } },
          { name: "pad_size2", padded: { min_size: 3, type: ["u8", 4] } },
          { name: "pad_after", padded: { after: 3, type: "u8" } },
        ],
      },
    },
  });
  const programIdl2 = idlProgramParse({
    accounts: {
      MyAccount: {
        discriminator: [22],
        fields: [
          { name: "pad_before", padded: { before: 3, type: "u8" } },
          { name: "pad_size1", padded: { min_size: 3, array: ["u8", 2] } },
          { name: "pad_size2", padded: { min_size: 3, array: ["u8", 4] } },
          { name: "pad_after", padded: { after: 3, type: "u8" } },
        ],
      },
    },
  });
  // Assert that all are equivalent
  expect(programIdl1).toStrictEqual(programIdl2);
  // Choose the account
  const accountIdl = expectDefined(programIdl1.accounts.get("MyAccount"));
  // Dummy state we'll encode/decode
  const accountState = {
    pad_before: 40,
    pad_size1: [50, 51],
    pad_size2: [60, 61, 62, 63],
    pad_after: 70,
  };
  // Check that we can use the manual IDL to encode/decode our account
  const accountData = idlAccountEncode(accountIdl, accountState);
  expect(accountData).toStrictEqual(
    new Uint8Array([22, 0, 0, 0, 40, 50, 51, 0, 60, 61, 62, 63, 70, 0, 0, 0]),
  );
  expect(idlAccountDecode(accountIdl, accountData)).toStrictEqual(accountState);
});
