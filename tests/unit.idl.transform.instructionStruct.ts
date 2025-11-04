import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlInstructionAccountsDecode,
  idlInstructionAccountsEncode,
  idlInstructionArgsDecode,
  idlInstructionArgsEncode,
  idlProgramParse,
  pubkeyNewDummy,
} from "../src";

it("run", () => {
  // Create an IDL on the fly
  const programIdl = idlProgramParse({
    instructions: {
      my_ix: {
        discriminator: [77, 78],
        accounts: [
          { name: "signer", signer: true },
          { name: "writable", writable: true },
        ],
        args: [
          { name: "arg1", type: { defined: "MyArg" } },
          { name: "arg2", type: "i16" },
        ],
      },
    },
    types: {
      MyArg: {
        fields: [
          { name: "id", type: "u16" },
          { name: "data", type: { vec: "u8" } },
        ],
      },
    },
  });
  // Choose the instruction
  const instructionIdl = expectDefined(programIdl.instructions.get("my_ix"));
  // Generate some addresses and payload to encode/decode
  const signerAddress = pubkeyNewDummy();
  const writableAddress = pubkeyNewDummy();
  const instructionAddresses = {
    signer: signerAddress,
    writable: writableAddress,
  };
  const instructionPayload = {
    arg1: { id: 42, data: [1, 2, 3] },
    arg2: -2,
  };
  // Check instruction inputs encoding/decoding
  const instructionInputs = idlInstructionAccountsEncode(
    instructionIdl,
    instructionAddresses,
  );
  expect(instructionInputs).toStrictEqual([
    { address: signerAddress, signer: true, writable: false },
    { address: writableAddress, signer: false, writable: true },
  ]);
  expect(
    idlInstructionAccountsDecode(instructionIdl, instructionInputs),
  ).toStrictEqual(instructionAddresses);
  // Check instruction data encoding/decoding
  const instructionData = idlInstructionArgsEncode(
    instructionIdl,
    instructionPayload,
  );
  expect(instructionData).toStrictEqual(
    new Uint8Array([77, 78, 42, 0, 3, 0, 0, 0, 1, 2, 3, 254, 255]),
  );
  expect(
    idlInstructionArgsDecode(instructionIdl, instructionData),
  ).toStrictEqual(instructionPayload);
});
