import { expect, it } from "@jest/globals";
import { idlAccountDecode, idlAccountEncode, idlProgramParse } from "../src";

it("run", () => {
  // Create an IDL on the fly
  const programIdl = idlProgramParse({
    accounts: {
      MyAccount: {
        discriminator: [22],
        fields: [
          { name: "u8", type: "u8" },
          { name: "u16", type: "u16" },
          { name: "u32", type: "u32" },
          { name: "u64", type: "u64" },
          { name: "u128", type: "u128" },
          { name: "i8", type: "i8" },
          { name: "i16", type: "i16" },
          { name: "i32", type: "i32" },
          { name: "i64", type: "i64" },
          { name: "i128", type: "i128" },
        ],
      },
    },
  });
  // Choose the account
  const accountIdl = programIdl.accounts.get("MyAccount")!;
  // Dummy state we'll encode/decode
  const accountstateRaw = {
    u8: 0xff,
    u16: 0xffff,
    u32: 0xffffffff,
    u64: 0xffffffffffffffffn.toString(),
    u128: 0xffffffffffffffffffffffffffffffffn.toString(),
    i8: -0x80,
    i16: -0x8000,
    i32: -0x80000000,
    i64: (-0x8000000000000000n).toString(),
    i128: (-0x80000000000000000000000000000000n).toString(),
  };
  const accountStateV1 = {
    u8: 8,
    u16: 16,
    u32: 32,
    u64: "64",
    u128: "128",
    i8: -8,
    i16: -16,
    i32: -32,
    i64: "-64",
    i128: "-128",
  };
  const accountStateV2 = {
    u8: 8,
    u16: 16,
    u32: 32,
    u64: 64,
    u128: 128,
    i8: -8,
    i16: -16,
    i32: -32,
    i64: -64,
    i128: -128,
  };
  // Check that we can properly serialize every versions
  const accountDataRaw = idlAccountEncode(accountIdl, accountstateRaw);
  expect(accountDataRaw).toStrictEqual(
    new Uint8Array(
      [
        [22],
        [ff],
        [ff, ff],
        [ff, ff, ff, ff],
        [ff, ff, ff, ff, ff, ff, ff, ff],
        [ff, ff, ff, ff, ff, ff, ff, ff, ff, ff, ff, ff, ff, ff, ff, ff],
        [128],
        [0, 128],
        [0, 0, 0, 128],
        [0, 0, 0, 0, 0, 0, 0, 128],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 128],
      ].flat(),
    ),
  );
  const accountDataV1 = idlAccountEncode(accountIdl, accountStateV1);
  expect(accountDataV1).toStrictEqual(
    new Uint8Array(
      [
        [22],
        [8],
        [16, 0],
        [32, 0, 0, 0],
        [64, 0, 0, 0, 0, 0, 0, 0],
        [128, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [248],
        [240, ff],
        [224, ff, ff, ff],
        [192, ff, ff, ff, ff, ff, ff, ff],
        [128, ff, ff, ff, ff, ff, ff, ff, ff, ff, ff, ff, ff, ff, ff, ff],
      ].flat(),
    ),
  );
  const accountDataV2 = idlAccountEncode(accountIdl, accountStateV2);
  expect(accountDataV2).toStrictEqual(accountDataV1);
  // Check that we can properly deserialize every versions
  expect(idlAccountDecode(accountIdl, accountDataRaw)).toStrictEqual(
    accountstateRaw,
  );
  expect(idlAccountDecode(accountIdl, accountDataV1)).toStrictEqual(
    accountStateV1,
  );
  expect(idlAccountDecode(accountIdl, accountDataV2)).toStrictEqual(
    accountStateV1,
  );
});

const ff = 0xff;
