import { expect, it } from "@jest/globals";
import { jsonTypePubkey, pubkeyNewDummy } from "solana-kiss-data";
import { idlInstructionAddressesFind, idlProgramParse } from "../src";

it("run", () => {
  // Keys used during the test
  const dummyAddress = pubkeyNewDummy();
  // Create an IDL on the fly
  const programIdl = idlProgramParse({
    instructions: {
      my_ix: {
        discriminator: [77, 78],
        accounts: [
          {
            name: "const_address",
            address: jsonTypePubkey.encoder(dummyAddress),
          },
        ],
      },
    },
  });
  // Assert that the accounts can be properly resolved
  const instructionAddresses = idlInstructionAddressesFind(
    programIdl.instructions.get("my_ix")!,
    {
      instructionProgramAddress: pubkeyNewDummy(),
      instructionAddresses: new Map(),
      instructionPayload: {},
    },
  );
  expect(instructionAddresses.get("const_address")).toStrictEqual(dummyAddress);
});
