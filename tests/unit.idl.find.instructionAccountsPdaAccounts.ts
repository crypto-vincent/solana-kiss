import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlInstructionAddressesFind,
  idlProgramParse,
  JsonValue,
  pubkeyFindPdaAddress,
  pubkeyNewDummy,
  pubkeyToBytes,
  utf8Encode,
} from "../src";

it("run", () => {
  // Create an IDL on the fly
  const programIdl = idlProgramParse({
    instructions: {
      my_ix: {
        discriminator: [33, 34],
        accounts: [
          { name: "first" },
          {
            name: "nester",
            accounts: [{ name: "nested1" }, { name: "nested2" }],
          },
          {
            name: "pda",
            pda: {
              seeds: [
                { kind: "account", path: "first" },
                { kind: "account", path: "first.u8" },
                { kind: "account", path: "first.u16" },
                { kind: "account", path: "first.u32" },
                { kind: "account", path: "first.u64" },
                { account: "MyAccount", path: "first.array_u8_2" },
                { account: "MyAccount", path: "first.vec_u8_3" },
                { account: "MyAccount", path: "first.string" },
                { account: "MyAccount", path: "first.inner.u8" },
                { account: "MyAccount", path: "first.inner.u16" },
                { kind: "account", path: "first.inner.u16", type: "u8" },
                { kind: "account", path: "first.inner.u16", type: "u32" },
                { kind: "account", path: "nester.nested1" },
                { kind: "account", path: "nester.nested2", type: "i16" },
              ],
            },
          },
        ],
      },
    },
    accounts: {
      MyAccount: {
        fields: [
          { name: "u8", type: "u8" },
          { name: "u16", type: "u16" },
          { name: "u32", type: "u32" },
          { name: "u64", type: "u64" },
          { name: "array_u8_2", type: ["u8", 2] },
          { name: "vec_u8_3", type: ["u8"] },
          { name: "string", type: "string" },
          {
            name: "inner",
            fields: [
              { name: "u8", type: "u8" },
              { name: "u16", type: "u16" },
            ],
          },
        ],
      },
    },
  });
  // Keys used during the test
  const firstAddress = pubkeyNewDummy();
  const nested1Address = pubkeyNewDummy();
  const programAddress = pubkeyNewDummy();
  const pdaSeeds = [
    pubkeyToBytes(firstAddress),
    new Uint8Array([77]),
    new Uint8Array([78, 0]),
    new Uint8Array([79, 0, 0, 0]),
    new Uint8Array([80, 0, 0, 0, 0, 0, 0, 0]),
    new Uint8Array([11, 12]),
    new Uint8Array([21, 22, 23]),
    utf8Encode("hello"),
    new Uint8Array([111]),
    new Uint8Array([222, 0]),
    new Uint8Array([222]),
    new Uint8Array([222, 0, 0, 0]),
    pubkeyToBytes(nested1Address),
    new Uint8Array([42, 0]),
  ];
  const pdaAddress = pubkeyFindPdaAddress(programAddress, pdaSeeds);
  // Assert that the accounts can be properly resolved
  const accountIdl = expectDefined(programIdl.accounts.get("MyAccount"));
  const instructionIdl = expectDefined(programIdl.instructions.get("my_ix"));
  const instructionAddresses = idlInstructionAddressesFind(instructionIdl, {
    instructionProgramAddress: programAddress,
    instructionAddresses: new Map([
      ["first", firstAddress],
      ["nester.nested1", nested1Address],
    ]),
    instructionPayload: {},
    instructionAccountsStates: new Map<string, JsonValue>([
      [
        "first",
        {
          u8: 77,
          u16: 78,
          u32: 79,
          u64: 80,
          array_u8_2: [11, 12],
          vec_u8_3: [21, 22, 23],
          string: "hello",
          inner: {
            u8: 111,
            u16: 222,
          },
        },
      ],
      ["nester.nested2", 42],
    ]),
    instructionAccountsTypes: { first: accountIdl.typeFull },
  });
  expect(instructionAddresses.get("pda")).toStrictEqual(pdaAddress);
});
