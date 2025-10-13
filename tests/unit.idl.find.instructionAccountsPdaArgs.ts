import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlInstructionAddressesFind,
  idlProgramParse,
  pubkeyFindPdaAddress,
  pubkeyNewDummy,
  utf8Encode,
} from "../src";

it("run", () => {
  // Create an IDL on the fly
  const programIdl = idlProgramParse({
    instructions: {
      my_ix: {
        discriminator: [77, 78],
        accounts: [
          {
            name: "pda",
            pda: {
              seeds: [
                { kind: "arg", path: "u8" },
                { kind: "arg", path: "u16" },
                { kind: "arg", path: "u32" },
                { kind: "arg", path: "u64" },
                { kind: "arg", path: "array_u8_2" },
                { kind: "arg", path: "vec_u8_3" },
                { kind: "arg", path: "string" },
                { kind: "arg", path: "inner.u8" },
                { kind: "arg", path: "inner.u16" },
                { kind: "arg", path: "inner.u16", type: "u8" },
                { kind: "arg", path: "inner.u16", type: "u32" },
              ],
            },
          },
        ],
        args: [
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
  const programAddress = pubkeyNewDummy();
  const pdaSeeds = [
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
  ];
  const pdaAddress = pubkeyFindPdaAddress(programAddress, pdaSeeds);
  // Assert that the accounts can be properly resolved
  const instructionAddresses = idlInstructionAddressesFind(
    expectDefined(programIdl.instructions.get("my_ix")),
    {
      instructionProgramAddress: programAddress,
      instructionAddresses: new Map(),
      instructionPayload: {
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
    },
  );
  expect(instructionAddresses.get("pda")).toStrictEqual(pdaAddress);
});
