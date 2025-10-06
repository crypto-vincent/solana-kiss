import { expect, it } from "@jest/globals";
import {
  idlInstructionAddressesFind,
  idlInstructionDecode,
  idlInstructionEncode,
  idlProgramParse,
  pubkeyNewDummy,
} from "../src";

it("run", () => {
  // Parse IDL from file JSON directly
  const programIdl = idlProgramParse(require("./fixtures/idl_anchor_26.json"));
  // IDL instruction
  const instructionIdl = programIdl.instructions.get("create_deal")!;
  // Program
  const programAddress = pubkeyNewDummy();
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
  // Prepare instruction accounts addresses
  const instructionAddressesBefore = new Map([
    ["owner", pubkeyNewDummy()],
    ["borrower", pubkeyNewDummy()],
    ["global_market_state", pubkeyNewDummy()],
    ["system_program", pubkeyNewDummy()],
  ]);
  // Find missing instruction accounts
  const instructionAddressesAfter = idlInstructionAddressesFind(
    instructionIdl,
    {
      instructionProgramAddress: programAddress,
      instructionAddresses: instructionAddressesBefore,
      instructionPayload,
      instructionAccountsStates: new Map([
        ["borrower_info", { num_of_deals: 42 }],
      ]),
    },
  );
  // Check that we can encode it and then decode it
  const instruction = idlInstructionEncode(
    instructionIdl,
    programAddress,
    instructionAddressesAfter,
    instructionPayload,
  );
  expect(idlInstructionDecode(instructionIdl, instruction)).toStrictEqual({
    instructionProgramAddress: programAddress,
    instructionAddresses: instructionAddressesAfter,
    instructionPayload,
  });
});
