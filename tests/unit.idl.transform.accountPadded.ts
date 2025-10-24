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
          { name: "pad_end_under", padded: { end: 3, type: ["u8", 2] } },
          { name: "pad_end_over", padded: { end: 3, type: ["u8", 4] } },
          {
            name: "pad_combo_under",
            padded: { before: 1, end: 3, type: ["u8", 2] },
          },
          {
            name: "pad_combo_over",
            padded: { before: 1, end: 3, type: ["u8", 4] },
          },
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
          { name: "pad_end_under", padded: { end: 3, array: ["u8", 2] } },
          { name: "pad_end_over", padded: { end: 3, array: ["u8", 4] } },
          {
            name: "pad_combo_under",
            padded: { before: 1, end: 3, type: ["u8", 2] },
          },
          {
            name: "pad_combo_over",
            padded: { before: 1, end: 3, type: ["u8", 4] },
          },
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
    pad_end_under: [50, 51],
    pad_end_over: [60, 61, 62, 63],
    pad_combo_under: [70, 71],
    pad_combo_over: [80, 81, 82, 83],
  };
  // Check that we can use the manual IDL to encode/decode our account
  const accountData = idlAccountEncode(accountIdl, accountState);
  expect(accountData).toStrictEqual(
    new Uint8Array([
      22, 0, 0, 0, 40, 50, 51, 0, 60, 61, 62, 63, 0, 70, 71, 0, 0, 80, 81, 82,
      83,
    ]),
  );
  expect(idlAccountDecode(accountIdl, accountData)).toStrictEqual(accountState);
});
