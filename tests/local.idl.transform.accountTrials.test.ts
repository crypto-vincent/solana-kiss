import { expect, it } from "@jest/globals";
import {
  expectDefined,
  IdlAccount,
  idlAccountDecode,
  idlAccountEncode,
  idlProgramParse,
  JsonValue,
} from "../src";

it("run", () => {
  // Create an IDL on the fly
  const programIdl = idlProgramParse({
    accounts: {
      MyAccount: {
        discriminator: [18],
        fields: [
          {
            candidates: [
              { name: "vArray", array: ["u8", 99] },
              { name: "vString", type: "string" },
              {
                name: "vObj1",
                fields: [
                  { name: "u64_1", type: "u64" },
                  { name: "u64_2", type: "u64" },
                  { name: "u64_3", type: "u64" },
                ],
              },
              {
                name: "vObj2",
                fields: [
                  { name: "u64_1", type: "u64" },
                  { name: "u64_2", type: "u64" },
                ],
              },
              { name: "v64", type: "u64" },
              { name: "v32", type: "u32" },
              { name: "v8", type: "u8" },
              { name: "v0", fields: [] },
            ],
          },
        ],
      },
    },
  });
  // Check that we can use the manual IDL to encode/decode in different ways
  const accountIdl = expectDefined(programIdl.accounts.get("MyAccount"));
  roundTrip(
    accountIdl,
    [{ vArray: new Array(99).fill(22) }],
    [[18], new Array(99).fill(22)].flat(),
  );
  roundTrip(
    accountIdl,
    [{ vString: "hello" }],
    [[18], [5, 0, 0, 0], [104, 101, 108, 108, 111]].flat(),
  );
  roundTrip(
    accountIdl,
    [{ vObj1: { u64_1: "77", u64_2: "88", u64_3: "99" } }],
    [[18], u64(77n), u64(88n), u64(99n)].flat(),
  );
  roundTrip(
    accountIdl,
    [{ vObj2: { u64_1: "55", u64_2: "66" } }],
    [[18], u64(55n), u64(66n)].flat(),
  );
  roundTrip(accountIdl, [{ v64: "64" }], [18, ...u64(64n)]);
  roundTrip(accountIdl, [{ v32: 32 }], [18, 32, 0, 0, 0]);
  roundTrip(accountIdl, [{ v8: 8 }], [18, 8]);
  roundTrip(accountIdl, [{ v0: null }], [18]);
});

function roundTrip(
  accountIdl: IdlAccount,
  accountState: JsonValue,
  accountBytes: Array<number>,
) {
  const accountData = new Uint8Array(accountBytes);
  expect(idlAccountEncode(accountIdl, accountState).accountData).toStrictEqual(
    accountData,
  );
  expect(idlAccountDecode(accountIdl, accountData).accountState).toStrictEqual(
    accountState,
  );
}

function u64(value: bigint): Array<number> {
  const blob = new Uint8Array(8);
  const data = new DataView(blob.buffer);
  data.setBigUint64(0, value, true);
  return Array.from(blob);
}
