import { expect, it } from "@jest/globals";
import { pubkeyNewDummy } from "solana-kiss-data";
import {
  idlAccountDecode,
  idlAccountEncode,
  idlInstructionArgsDecode,
  idlInstructionArgsEncode,
  idlProgramParse,
} from "../src";

it("run", () => {
  // Parse IDL from file JSON directly
  const programIdl = idlProgramParse(require("./fixtures/idl_anchor_30.json"));
  // Instruction used
  const instructionIdl = programIdl.instructions.get("campaign_create")!;
  // Prepare instruction payload
  const instructionPayloadMetadataBytes = new Array<number>();
  for (let index = 0; index < 512; index++) {
    instructionPayloadMetadataBytes.push(index % 100);
  }
  const instructionPayload = {
    params: {
      index: "42",
      funding_goal_collateral_amount: "41",
      funding_phase_duration_seconds: 99,
      metadata: {
        length: 22,
        bytes: instructionPayloadMetadataBytes,
      },
    },
  };
  // Encode / decode the instruction payload and check that they match the original
  const instructionData = idlInstructionArgsEncode(
    instructionIdl,
    instructionPayload,
  );
  expect(instructionPayload).toStrictEqual(
    idlInstructionArgsDecode(instructionIdl, instructionData),
  );
  // IDL Account used
  const campaignAccountIdl = programIdl.accounts.get("Campaign")!;
  // Prepare account state
  const campaignAccountStateMetadataBytes = new Array<number>();
  for (let index = 0; index < 512; index++) {
    campaignAccountStateMetadataBytes.push(index % 100);
  }
  const campaignAccountState = {
    bump: 99,
    index: "77",
    authority: pubkeyNewDummy(),
    collateral_mint: pubkeyNewDummy(),
    redeemable_mint: pubkeyNewDummy(),
    funding_goal_collateral_amount: "11",
    total_deposited_collateral_amount: "22",
    total_claimed_redeemable_amount: "33",
    funding_phase_start_unix_timestamp: "-44",
    funding_phase_end_unix_timestamp: "-55",
    extracted_collateral_amount: "66",
    metadata: {
      length: 99,
      bytes: campaignAccountStateMetadataBytes,
    },
  };
  // Encode/decode the account state and check that it matches the original
  const campaignAccountData = idlAccountEncode(
    campaignAccountIdl,
    campaignAccountState,
  );
  expect(campaignAccountData.length).toStrictEqual(675);
  expect(campaignAccountState).toStrictEqual(
    idlAccountDecode(campaignAccountIdl, campaignAccountData),
  );
  // IDL Account used
  const pledgeAccountIdl = programIdl.accounts.get("Pledge")!;
  const pledgeAccountState = {
    bump: 44,
    deposited_collateral_amount: "999",
    claimed_redeemable_amount: "22",
  };
  // Encode/decode the account content and check that it matches the original
  const pledgeAccountData = idlAccountEncode(
    pledgeAccountIdl,
    pledgeAccountState,
  );
  expect(pledgeAccountData.length).toStrictEqual(25);
  expect(pledgeAccountState).toStrictEqual(
    idlAccountDecode(pledgeAccountIdl, pledgeAccountData),
  );
});
