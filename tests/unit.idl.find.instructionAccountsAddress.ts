import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlInstructionAddressesFind,
  idlProgramParse,
  pubkeyNewDummy,
  pubkeyToBase58,
} from "../src";

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
            address: pubkeyToBase58(dummyAddress),
          },
        ],
      },
    },
  });
  // Assert that the accounts can be properly resolved
  const instructionAddresses = idlInstructionAddressesFind(
    expectDefined(programIdl.instructions.get("my_ix")),
    {
      instructionProgramAddress: pubkeyNewDummy(),
      instructionAddresses: new Map(),
      instructionPayload: {},
    },
  );
  expect(instructionAddresses.get("const_address")).toStrictEqual(dummyAddress);
});
