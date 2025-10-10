import { expect, it } from "@jest/globals";
import { idlAccountEncode, idlProgramParse } from "../src";

it("run", () => {
  // Create an IDL on the fly
  const programIdl = idlProgramParse({
    accounts: {
      MyAccount: {
        fields: [
          { name: "bytes", type: "bytes" },
          { name: "vec_u8", type: { vec: "u8" } },
          { name: "arr_u8", type: ["u8", 18] },
        ],
      },
    },
  });
  // Check that we can use the manual IDL to encode/decode our account in different ways
  const accountIdl = programIdl.accounts.get("MyAccount")!;
  const bytesCoordinatorJoinRun = [
    67, 111, 111, 114, 100, 105, 110, 97, 116, 111, 114, 74, 111, 105, 110, 82,
    117, 110,
  ];
  const case1 = idlAccountEncode(accountIdl, {
    bytes: bytesCoordinatorJoinRun,
    vec_u8: bytesCoordinatorJoinRun,
    arr_u8: bytesCoordinatorJoinRun,
  });
  const case2 = idlAccountEncode(accountIdl, {
    bytes: { utf8: "CoordinatorJoinRun" },
    vec_u8: { utf8: "CoordinatorJoinRun" },
    arr_u8: { utf8: "CoordinatorJoinRun" },
  });
  const case3 = idlAccountEncode(accountIdl, {
    bytes: { value: "CoordinatorJoinRun", type: "string8", prefixed: false },
    vec_u8: { value: "CoordinatorJoinRun", type: "string16" },
    arr_u8: { value: "CoordinatorJoinRun" },
  });
  const case4 = idlAccountEncode(accountIdl, {
    bytes: { base16: "436F6F7264696E61746F724A6F696E52756E" },
    vec_u8: { base58: "3oEADzTpGyQHQioFsuM8mzvXf" },
    arr_u8: { base64: "Q29vcmRpbmF0b3JKb2luUnVu" },
  });
  const case5 = idlAccountEncode(accountIdl, {
    bytes: {
      value: ["Coordinator", "Join", "Run"],
      type: ["string"],
    },
    vec_u8: {
      value: [{ utf8: "Coordinator" }, { utf8: "Join" }, [82, 117, 110]],
      type: ["bytes", 3],
    },
    arr_u8: {
      value: ["Coordinator", "Join", "Run"],
      type: { vec: "string" },
      prefixed: false,
    },
  });
  // Check that we got the correct results
  const expected = new Uint8Array(
    [
      Array.from(accountIdl.discriminator),
      [18, 0, 0, 0],
      bytesCoordinatorJoinRun,
      [18, 0, 0, 0],
      bytesCoordinatorJoinRun,
      bytesCoordinatorJoinRun,
    ].flat(),
  );
  expect(case1).toStrictEqual(expected);
  expect(case2).toStrictEqual(expected);
  expect(case3).toStrictEqual(expected);
  expect(case4).toStrictEqual(expected);
  expect(case5).toStrictEqual(expected);
});
