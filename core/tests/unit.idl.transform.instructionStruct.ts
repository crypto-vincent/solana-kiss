import {
  idlInstructionDecode,
  idlInstructionEncode,
  idlProgramParse,
  Pubkey,
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
  const instructionIdl = programIdl.instructions.get("my_ix")!;
  // Check that we can use the manual IDL to encode/decode our IX
  const instructionProgramAddress = pubkeyNewDummy();
  const instructionPayload = {
    arg1: {
      id: 42,
      data: [1, 2, 3],
    },
    arg2: -2,
  };
  const instructionAddresses = new Map<string, Pubkey>([
    ["signer", pubkeyNewDummy()],
    ["writable", pubkeyNewDummy()],
  ]);
  const instruction = idlInstructionEncode(
    instructionIdl,
    instructionProgramAddress,
    instructionAddresses,
    instructionPayload,
  );
  expect(instruction).toStrictEqual({
    programAddress: instructionProgramAddress,
    inputs: [
      {
        address: instructionAddresses.get("signer")!,
        signing: true,
        writable: false,
      },
      {
        address: instructionAddresses.get("writable")!,
        signing: false,
        writable: true,
      },
    ],
    data: new Uint8Array([77, 78, 42, 0, 3, 0, 0, 0, 1, 2, 3, 254, 255]),
  });
  expect(idlInstructionDecode(instructionIdl, instruction)).toStrictEqual({
    instructionProgramAddress,
    instructionPayload,
    instructionAddresses,
  });
});
