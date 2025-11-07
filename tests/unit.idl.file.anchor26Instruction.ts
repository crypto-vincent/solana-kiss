import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlInstructionAccountsDecode,
  idlInstructionAccountsEncode,
  idlInstructionAddressesHydrate,
  idlInstructionArgsDecode,
  idlInstructionArgsEncode,
  idlProgramParse,
  pubkeyNewDummy,
} from "../src";

it("run", async () => {
  // Parse IDL from file JSON directly
  const programIdl = idlProgramParse(require("./fixtures/idl_anchor_26.json"));
  // IDL instruction
  const instructionIdl = expectDefined(
    programIdl.instructions.get("create_deal"),
  );
  // Program
  const programAddress = pubkeyNewDummy();
  const borrowerAddress = pubkeyNewDummy();
  // Prepare instruction args
  const instructionPayload = {
    max_funding_duration: 42,
    deal_name: "deal hello world",
    arrangement_fees: "41",
    arrangement_fee_percentage: {
      numerator: 100,
      denominator: 1,
    },
    migrated: true,
  };
  // Find missing instruction accounts
  const instructionAddresses = await idlInstructionAddressesHydrate(
    instructionIdl,
    programAddress,
    {
      instructionAddresses: {
        owner: pubkeyNewDummy(),
        borrower: borrowerAddress,
        global_market_state: pubkeyNewDummy(),
        system_program: pubkeyNewDummy(),
      },
      instructionPayload,
    },
    { borrower_info: { accountState: { num_of_deals: 42 } } },
  );
  // Check that we can encode it and then decode it
  const instructionInputs = idlInstructionAccountsEncode(
    instructionIdl,
    instructionAddresses,
  );
  expect(
    idlInstructionAccountsDecode(instructionIdl, instructionInputs),
  ).toStrictEqual(instructionAddresses);
  const instructionData = idlInstructionArgsEncode(
    instructionIdl,
    instructionPayload,
  );
  expect(
    idlInstructionArgsDecode(instructionIdl, instructionData),
  ).toStrictEqual(instructionPayload);
});
