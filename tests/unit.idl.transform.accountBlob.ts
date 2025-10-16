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
          { name: "blob_before", bytes: { encode: { value: [1, 2, 3] } } },
          { name: "value", type: "u8" },
          { name: "blob_empty", bytes: { zeroes: 0 } },
          { name: "blob_after", bytes: { base16: "040506" } },
        ],
      },
    },
  });
  const programIdl2 = idlProgramParse({
    accounts: {
      MyAccount: {
        discriminator: [22],
        fields: [
          { name: "blob_before", bytes: { base58: "Ldp" } },
          { name: "value", type: "u8" },
          { name: "blob_empty", bytes: [] },
          { name: "blob_after", bytes: { base64: "BAUG" } },
        ],
      },
    },
  });
  const programIdl3 = idlProgramParse({
    accounts: {
      MyAccount: {
        discriminator: [22],
        fields: [
          { name: "blob_before", bytes: [1, 2, 3] },
          { name: "value", type: "u8" },
          { name: "blob_empty", bytes: [] },
          {
            name: "blob_after",
            bytes: {
              encode: {
                value: { a: [null, null, null, null], c: 6 },
                type: {
                  fields: [
                    { name: "a", vec8: { fields: [] } },
                    { bytes: [5] },
                    { name: "c", type: "u8" },
                  ],
                },
                prefixed: true,
              },
            },
          },
        ],
      },
    },
  });
  // Assert that all are equivalent
  expect(programIdl1).toStrictEqual(programIdl2);
  expect(programIdl1).toStrictEqual(programIdl3);
  // Choose the account
  const accountIdl = expectDefined(programIdl1.accounts.get("MyAccount"));
  // Check that we can use the manual IDL to encode/decode our account
  const accountData = idlAccountEncode(accountIdl, {
    blob_before: undefined,
    value: 42,
    blob_after: null,
  });
  expect(accountData).toStrictEqual(new Uint8Array([22, 1, 2, 3, 42, 4, 5, 6]));
  expect(idlAccountDecode(accountIdl, accountData)).toStrictEqual({
    value: 42,
  });
});
