import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlAccountDecode,
  idlAccountEncode,
  idlProgramParse,
  pubkeyNewDummy,
  pubkeyToBytes,
} from "../src";

it("run", () => {
  // Create IDLs using different shortened formats
  const programIdl1 = idlProgramParse({
    accounts: {
      MyAccount: {
        discriminator: [77],
        fields: [
          { name: "coption1", coption: "u8" },
          { name: "coption2", coption: "u8" },
          { name: "coption3", type: "COption<PublicKey>" },
          { name: "coption4", type: "COption<PublicKey>" },
          { name: "option", option: "u8" },
          { name: "option8", option8: "u8" },
          { name: "option16", option16: "u8" },
          { name: "option32", option32: "u8" },
          { name: "vec", vec: "u8" },
          { name: "vec8", vec8: "u8" },
          { name: "vec16", vec16: "u8" },
          { name: "vec32", vec32: "u8" },
          { name: "string", type: "string" },
          { name: "string8", type: "string8" },
          { name: "string16", type: "string16" },
          { name: "string32", type: "string32" },
          { name: "variants", variants: ["A", "B", "C", "D"] },
          { name: "variants8", variants8: ["A", "B", "C", "D"] },
          { name: "variants16", variants16: ["A", "B", "C", "D"] },
          { name: "variants32", variants32: ["A", "B", "C", "D"] },
        ],
      },
    },
  });
  const programIdl2 = idlProgramParse({
    accounts: {
      MyAccount: {
        discriminator: [77],
        fields: [
          { name: "coption1", type: { coption: "u8" } },
          { name: "coption2", type: { coption: "u8" } },
          { name: "coption3", type: "COption<Pubkey>" },
          { name: "coption4", type: "COption<Pubkey>" },
          { name: "option", type: { option: "u8" } },
          { name: "option8", type: { option8: "u8" } },
          { name: "option16", type: { option16: "u8" } },
          { name: "option32", type: { option32: "u8" } },
          { name: "vec", type: { vec: "u8" } },
          { name: "vec8", type: { vec8: "u8" } },
          { name: "vec16", type: { vec16: "u8" } },
          { name: "vec32", type: { vec32: "u8" } },
          { name: "string", type: "string" },
          { name: "string8", type: "string8" },
          { name: "string16", type: "string16" },
          { name: "string32", type: "string32" },
          { name: "variants", type: { variants: ["A", "B", "C", "D"] } },
          { name: "variants8", type: { variants8: ["A", "B", "C", "D"] } },
          { name: "variants16", type: { variants16: ["A", "B", "C", "D"] } },
          { name: "variants32", type: { variants32: ["A", "B", "C", "D"] } },
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
    coption1: null,
    coption2: 39,
    coption3: pubkeyNewDummy(),
    coption4: null,
    option: 40,
    option8: 41,
    option16: 42,
    option32: 43,
    vec: [50],
    vec8: [51],
    vec16: [52],
    vec32: [53],
    string: "",
    string8: "A",
    string16: "BB",
    string32: "CCC",
    variants: "A",
    variants8: "B",
    variants16: "C",
    variants32: "D",
  };
  const accountBytes = new Uint8Array(
    [
      [77],
      flat([0, 0, 0, 0], [0]),
      flat([1, 0, 0, 0], [39]),
      flat([1, 0, 0, 0], Array.from(pubkeyToBytes(accountState.coption3))),
      flat([0, 0, 0, 0], new Array(32).fill(0)),
      flat([1], [40]),
      flat([1], [41]),
      flat([1, 0], [42]),
      flat([1, 0, 0, 0], [43]),
      flat([1, 0, 0, 0], [50]),
      flat([1], [51]),
      flat([1, 0], [52]),
      flat([1, 0, 0, 0], [53]),
      flat([0, 0, 0, 0], []),
      flat([1], [65]),
      flat([2, 0], [66, 66]),
      flat([3, 0, 0, 0], [67, 67, 67]),
      [0],
      [1],
      [2, 0],
      [3, 0, 0, 0],
    ].flat(),
  );
  // Check that we can use the manual IDL to encode/decode our account
  const { accountData } = idlAccountEncode(accountIdl, accountState);
  expect(accountData).toStrictEqual(accountBytes);
  expect(idlAccountDecode(accountIdl, accountData).accountState).toStrictEqual(
    accountState,
  );
});

function flat(...arrays: Array<Array<number>>): Array<number> {
  return arrays.flat();
}
