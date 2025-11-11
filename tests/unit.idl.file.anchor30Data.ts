import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlAccountDecode,
  idlAccountEncode,
  idlInstructionArgsDecode,
  idlInstructionArgsEncode,
  idlProgramParse,
  pubkeyNewDummy,
  pubkeyToBase58,
} from "../src";

it("run", () => {
  // Parse IDL from file JSON directly
  const programIdl = idlProgramParse(require("./fixtures/idl_anchor_30.json"));
  // Instruction used
  const instructionIdl = expectDefined(
    programIdl.instructions.get("campaign_create"),
  );
  // Prepare instruction payload
  const instructionPayloadMetadataBytes = new Array<number>();
  for (let index = 0; index < 512; index++) {
    instructionPayloadMetadataBytes.push(index % 100);
  }
  const instructionPayload = {
    params: {
      index: "42",
      fundingGoalCollateralAmount: "41",
      fundingPhaseDurationSeconds: 99,
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
  const campaignAccountIdl = expectDefined(programIdl.accounts.get("Campaign"));
  // Prepare account state
  const campaignAccountStateMetadataBytes = new Array<number>();
  for (let index = 0; index < 512; index++) {
    campaignAccountStateMetadataBytes.push(index % 100);
  }
  const campaignAccountState = {
    bump: 99,
    index: "77",
    authority: pubkeyToBase58(pubkeyNewDummy()),
    collateralMint: pubkeyToBase58(pubkeyNewDummy()),
    redeemableMint: pubkeyToBase58(pubkeyNewDummy()),
    fundingGoalCollateralAmount: "11",
    totalDepositedCollateralAmount: "22",
    totalClaimedRedeemableAmount: "33",
    fundingPhaseStartUnixTimestamp: "-44",
    fundingPhaseEndUnixTimestamp: "-55",
    extractedCollateralAmount: "66",
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
  const pledgeAccountIdl = expectDefined(programIdl.accounts.get("Pledge"));
  const pledgeAccountState = {
    bump: 44,
    depositedCollateralAmount: "999",
    claimedRedeemableAmount: "22",
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
