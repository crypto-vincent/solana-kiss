import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlInstructionAddressesFind,
  idlProgramParse,
  pubkeyFindPdaAddress,
  pubkeyNewDummy,
  pubkeyToBytes,
  utf8Encode,
} from "../src";

it("run", async () => {
  // Keys used during the test
  const programAddress1 = pubkeyNewDummy();
  const programAddress2 = pubkeyNewDummy();
  // Create IDLs on the fly
  const programIdl1 = idlProgramParse({
    instructions: {
      my_ix: {
        discriminator: [77, 78],
        accounts: [
          {
            name: "const_bytes_without_program",
            pda: {
              seeds: [
                { kind: "const", type: ["u8"], value: [41, 0, 0, 0] },
                { kind: "const", value: [42, 0, 0, 0] },
              ],
            },
          },
          {
            name: "const_bytes_with_program",
            pda: {
              seeds: [
                { kind: "const", type: ["u8"], value: [41, 0, 0, 0] },
                { kind: "const", value: [42, 0, 0, 0] },
              ],
              program: {
                kind: "const",
                value: [...pubkeyToBytes(programAddress2)],
              },
            },
          },
          {
            name: "const_string_without_program",
            pda: {
              seeds: [
                { kind: "const", type: "string", value: "hello" },
                { kind: "const", value: "world" },
              ],
            },
          },
          {
            name: "const_string_with_program",
            pda: {
              seeds: [
                { kind: "const", type: "string", value: "hello" },
                { kind: "const", value: "world" },
              ],
              program: {
                kind: "const",
                value: [...pubkeyToBytes(programAddress2)],
              },
            },
          },
        ],
      },
    },
  });
  const programIdl2 = idlProgramParse({
    instructions: {
      my_ix: {
        discriminator: [77, 78],
        accounts: [
          {
            name: "const_bytes_without_program",
            pda: {
              seeds: [
                [41, 0, 0, 0],
                [42, 0, 0, 0],
              ],
            },
          },
          {
            name: "const_bytes_with_program",
            pda: {
              seeds: [
                [41, 0, 0, 0],
                [42, 0, 0, 0],
              ],
              program: { value: [...pubkeyToBytes(programAddress2)] },
            },
          },
          {
            name: "const_string_without_program",
            pda: {
              seeds: ["hello", "world"],
            },
          },
          {
            name: "const_string_with_program",
            pda: {
              seeds: ["hello", "world"],
              program: { value: [...pubkeyToBytes(programAddress2)] },
            },
          },
        ],
      },
    },
  });
  // Make sure the IDLs are equivalent
  expect(programIdl1).toStrictEqual(programIdl2);
  // Pdas based off of const bytes seeds
  const pdaSeedsConstBytes = [
    new Uint8Array([41, 0, 0, 0]),
    new Uint8Array([42, 0, 0, 0]),
  ];
  const pdaConstBytes1 = pubkeyFindPdaAddress(
    programAddress1,
    pdaSeedsConstBytes,
  );
  const pdaConstBytes2 = pubkeyFindPdaAddress(
    programAddress2,
    pdaSeedsConstBytes,
  );
  // Pdas based off of const string seeds
  const pdaSeedsConstString = [utf8Encode("hello"), utf8Encode("world")];
  const pdaConstString1 = pubkeyFindPdaAddress(
    programAddress1,
    pdaSeedsConstString,
  );
  const pdaConstString2 = pubkeyFindPdaAddress(
    programAddress2,
    pdaSeedsConstString,
  );
  // Assert that the accounts can be properly resolved
  const instructionAddresses = idlInstructionAddressesFind(
    expectDefined(programIdl1.instructions.get("my_ix")),
    {
      instructionProgramAddress: programAddress1,
      instructionAddresses: {},
      instructionPayload: null,
    },
  );
  expect(instructionAddresses["const_bytes_without_program"]).toStrictEqual(
    pdaConstBytes1,
  );
  expect(instructionAddresses["const_bytes_with_program"]).toStrictEqual(
    pdaConstBytes2,
  );
  expect(instructionAddresses["const_string_without_program"]).toStrictEqual(
    pdaConstString1,
  );
  expect(instructionAddresses["const_string_with_program"]).toStrictEqual(
    pdaConstString2,
  );
});
