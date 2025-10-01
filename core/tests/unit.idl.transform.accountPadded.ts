import { idlAccountDecode, idlAccountEncode } from "../src/idl/IdlAccount";
import { idlProgramParse } from "../src/idl/IdlProgram";

it("run", () => {
  // Create IDLs using different shortened formats
  const idlProgram1 = idlProgramParse({
    accounts: {
      MyAccount: {
        discriminator: [22],
        fields: [
          { name: "padded_before", padded: { before: 3, type: "u8" } },
          { name: "padded_size1", padded: { min_size: 3, type: ["u8", 2] } },
          { name: "padded_size2", padded: { min_size: 3, type: ["u8", 4] } },
          { name: "padded_after", padded: { after: 3, type: "u8" } },
        ],
      },
    },
  });
  const idlProgram2 = idlProgramParse({
    accounts: {
      MyAccount: {
        discriminator: [22],
        fields: [
          { name: "padded_before", padded: { before: 3, type: "u8" } },
          { name: "padded_size1", padded: { min_size: 3, array: ["u8", 2] } },
          { name: "padded_size2", padded: { min_size: 3, array: ["u8", 4] } },
          { name: "padded_after", padded: { after: 3, type: "u8" } },
        ],
      },
    },
  });
  // Assert that all are equivalent
  expect(idlProgram1).toStrictEqual(idlProgram2);
  // Choose the account
  const idlAccount = idlProgram1.accounts.get("MyAccount")!;
  // Dummy state we'll encode/decode
  const accountState = {
    padded_before: 40,
    padded_size1: [50, 51],
    padded_size2: [60, 61, 62, 63],
    padded_after: 70,
  };
  // Check that we can use the manual IDL to encode/decode our account
  const accountData = idlAccountEncode(idlAccount, accountState);
  expect(accountData).toStrictEqual(
    new Uint8Array([22, 0, 0, 0, 40, 50, 51, 0, 60, 61, 62, 63, 70, 0, 0, 0]),
  );
  expect(idlAccountDecode(idlAccount, accountData)).toStrictEqual(accountState);
});
