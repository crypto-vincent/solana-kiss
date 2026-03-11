import { expect, it } from "@jest/globals";
import { expectDefined, idlAccountEncode, idlProgramParse } from "../src";

it("run", () => {
  // Create an IDL on the fly
  const programIdl = idlProgramParse({
    accounts: {
      MyAccount: {
        fields: [
          { name: "vec_u8", type: { vec: "u8" } },
          { name: "arr_u8", type: ["u8", 18] },
        ],
      },
    },
  });
  // Check that we can use the manual IDL to encode/decode our account in different ways
  const accountIdl = expectDefined(programIdl.accounts.get("MyAccount"));
  const bytesCoordinatorJoinRun = [
    67, 111, 111, 114, 100, 105, 110, 97, 116, 111, 114, 74, 111, 105, 110, 82,
    117, 110,
  ];
  const case1 = idlAccountEncode(accountIdl, {
    vec_u8: bytesCoordinatorJoinRun,
    arr_u8: bytesCoordinatorJoinRun,
  });
  const case2 = idlAccountEncode(accountIdl, {
    vec_u8: { base16: "436F6F7264696E61746F724A6F696E52756E" },
    arr_u8: { utf8: "CoordinatorJoinRun" },
  });
  const case3 = idlAccountEncode(accountIdl, {
    vec_u8: { base58: "3oEADzTpGyQHQioFsuM8mzvXf" },
    arr_u8: { base64: "Q29vcmRpbmF0b3JKb2luUnVu" },
  });
  const case4 = idlAccountEncode(accountIdl, {
    vec_u8: {
      encoded: { type: "string0", value: "CoordinatorJoinRun" },
    },
    arr_u8: {
      encoded: { type: "bytes0", value: { utf8: "CoordinatorJoinRun" } },
    },
  });
  const case5 = idlAccountEncode(accountIdl, {
    vec_u8: {
      encoded: {
        type: [{ vec0: "u8" }, 3],
        value: [{ utf8: "Coordinator" }, { utf8: "Join" }, [82, 117, 110]],
      },
    },
    arr_u8: {
      encoded: {
        type: { vec0: "string0" },
        value: ["Coordinator", "Join", "Run"],
      },
    },
  });
  // Check that we got the correct results
  const expected = new Uint8Array(
    [
      Array.from(accountIdl.discriminator),
      [18, 0, 0, 0],
      bytesCoordinatorJoinRun,
      bytesCoordinatorJoinRun,
    ].flat(),
  );
  expect(case1.accountData).toStrictEqual(expected);
  expect(case2.accountData).toStrictEqual(expected);
  expect(case3.accountData).toStrictEqual(expected);
  expect(case4.accountData).toStrictEqual(expected);
  expect(case5.accountData).toStrictEqual(expected);
});
