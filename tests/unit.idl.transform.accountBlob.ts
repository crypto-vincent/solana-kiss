import { expect, it } from "@jest/globals";
import { idlAccountDecode, idlAccountEncode, idlProgramParse } from "../src";

it("run", () => {
  // Create IDLs using different shortened formats
  const programIdl1 = idlProgramParse({
    accounts: {
      MyAccount: {
        discriminator: [22],
        fields: [
          { bytes: { value: [1, 2, 3] } },
          { name: "value", type: "u8" },
          { name: "blob_null", bytes: { type: null } },
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
          { bytes: { base58: "Ldp" } },
          { name: "value", type: "u8" },
          { name: "blob_null", bytes: { value: null } },
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
          { bytes: [1, 2, 3] },
          { name: "value", type: "u8" },
          { name: "blob_null", bytes: "" },
          {
            name: "blob_after",
            bytes: {
              value: { a: [null, null, null, null], c: 6 },
              prefixed: true,
              type: {
                fields: [
                  { name: "a", vec8: null },
                  { bytes: [5] },
                  { name: "c", type: "u8" },
                ],
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
  const accountIdl = programIdl1.accounts.get("MyAccount")!;
  // Check that we can use the manual IDL to encode/decode our account
  const accountData = idlAccountEncode(accountIdl, {
    value: 42,
    blob_after: null,
  });
  expect(accountData).toStrictEqual(new Uint8Array([22, 1, 2, 3, 42, 4, 5, 6]));
  expect(idlAccountDecode(accountIdl, accountData)).toStrictEqual({
    0: null,
    value: 42,
    blob_null: null,
    blob_after: null,
  });
});
