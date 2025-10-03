import { expect, it } from "@jest/globals";
import {
  pubkeyFindPdaAddress,
  pubkeyNewDummy,
  pubkeyToBytes,
} from "solana-kiss-data";
import { idlInstructionAddressesFind, idlProgramParse } from "../src";

it("run", () => {
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
    Uint8Array.from([41, 0, 0, 0]),
    Uint8Array.from([42, 0, 0, 0]),
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
  const pdaSeedsConstString = [
    new TextEncoder().encode("hello"),
    new TextEncoder().encode("world"),
  ];
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
    programIdl1.instructions.get("my_ix")!,
    {
      instructionProgramAddress: programAddress1,
      instructionAddresses: new Map(),
      instructionPayload: null,
    },
  );
  expect(instructionAddresses.get("const_bytes_without_program")).toStrictEqual(
    pdaConstBytes1,
  );
  expect(instructionAddresses.get("const_bytes_with_program")).toStrictEqual(
    pdaConstBytes2,
  );
  expect(
    instructionAddresses.get("const_string_without_program"),
  ).toStrictEqual(pdaConstString1);
  expect(instructionAddresses.get("const_string_with_program")).toStrictEqual(
    pdaConstString2,
  );
});
