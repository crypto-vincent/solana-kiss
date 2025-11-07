import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlInstructionAddressesHydrate,
  idlProgramParse,
  pubkeyNewDummy,
  pubkeyToBase58,
} from "../src";

it("run", async () => {
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
  const instructionAddresses = await idlInstructionAddressesHydrate(
    expectDefined(programIdl.instructions.get("my_ix")),
    pubkeyNewDummy(),
  );
  expect(instructionAddresses["const_address"]).toStrictEqual(dummyAddress);
});
