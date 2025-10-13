import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlInstructionAddressesFind,
  idlProgramParse,
  pubkeyFindPdaAddress,
  pubkeyFromBase58,
  pubkeyNewDummy,
  pubkeyToBase58,
  pubkeyToBytes,
  utf8Encode,
} from "../src";

const tokenProgramAddress = pubkeyFromBase58(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);
const ataProgramAddress = pubkeyFromBase58(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);

it("run", () => {
  // Parse IDL from file JSON directly
  const programIdl = idlProgramParse(require("./fixtures/idl_anchor_30.json"));
  // Important account addresses
  const programAddress = pubkeyNewDummy();
  const payerAddress = pubkeyNewDummy();
  const authorityAddress = pubkeyNewDummy();
  const userAddress = pubkeyNewDummy();
  const collateralMintAddress = pubkeyNewDummy();
  const redeemableMintAddress = pubkeyNewDummy();
  // Expected values for generatable accounts
  const authorityCollateralAddress = pubkeyFindPdaAddress(ataProgramAddress, [
    pubkeyToBytes(authorityAddress),
    pubkeyToBytes(tokenProgramAddress),
    pubkeyToBytes(collateralMintAddress),
  ]);
  const userCollateralAddress = pubkeyFindPdaAddress(ataProgramAddress, [
    pubkeyToBytes(userAddress),
    pubkeyToBytes(tokenProgramAddress),
    pubkeyToBytes(collateralMintAddress),
  ]);
  const campaignIndex = 42;
  const campaignAddress = pubkeyFindPdaAddress(programAddress, [
    utf8Encode("Campaign"),
    new Uint8Array([campaignIndex, 0, 0, 0, 0, 0, 0, 0]),
  ]);
  const campaignCollateralAddress = pubkeyFindPdaAddress(ataProgramAddress, [
    pubkeyToBytes(campaignAddress),
    pubkeyToBytes(tokenProgramAddress),
    pubkeyToBytes(collateralMintAddress),
  ]);
  const pledgeAddress = pubkeyFindPdaAddress(programAddress, [
    utf8Encode("Pledge"),
    pubkeyToBytes(campaignAddress),
    pubkeyToBytes(userAddress),
  ]);
  // Generate all missing IX accounts with just the minimum information
  const campaignCreateAddresses = idlInstructionAddressesFind(
    expectDefined(programIdl.instructions.get("campaign_create")),
    {
      instructionProgramAddress: programAddress,
      instructionAddresses: new Map([
        ["payer", payerAddress],
        ["authority", authorityAddress],
        ["collateral_mint", collateralMintAddress],
        ["redeemable_mint", redeemableMintAddress],
      ]),
      instructionPayload: {
        params: { index: campaignIndex },
      },
    },
  );
  // Check outcome
  expect(campaignAddress).toStrictEqual(
    campaignCreateAddresses.get("campaign"),
  );
  expect(campaignCollateralAddress).toStrictEqual(
    campaignCreateAddresses.get("campaign_collateral"),
  );
  // Generate all missing IX accounts with just the minimum information
  const campaignExtractAddresses = idlInstructionAddressesFind(
    expectDefined(programIdl.instructions.get("campaign_extract")),
    {
      instructionProgramAddress: programAddress,
      instructionAddresses: new Map([
        ["payer", payerAddress],
        ["authority", authorityAddress],
        ["authority_collateral", authorityCollateralAddress],
        ["campaign", campaignAddress],
      ]),
      instructionPayload: { params: { index: campaignIndex } },
      instructionAccountsStates: new Map([
        [
          "campaign",
          { collateral_mint: pubkeyToBase58(collateralMintAddress) },
        ],
      ]),
      instructionAccountsContentsTypeFull: new Map([
        ["campaign", programIdl.accounts.get("Campaign")!.typeFull],
      ]),
    },
  );
  // Check outcome
  expect(campaignCollateralAddress).toStrictEqual(
    campaignExtractAddresses.get("campaign_collateral"),
  );
  // Generate all missing IX accounts with just the minimum information
  const pledgeCreateAddresses = idlInstructionAddressesFind(
    expectDefined(programIdl.instructions.get("pledge_create")),
    {
      instructionProgramAddress: programAddress,
      instructionAddresses: new Map([
        ["payer", payerAddress],
        ["user", userAddress],
        ["campaign", campaignAddress],
      ]),
      instructionPayload: {},
    },
  );
  // Check outcome
  expect(pledgeAddress).toStrictEqual(pledgeCreateAddresses.get("pledge"));
  // Generate all missing IX accounts with just the minimum information
  const pledgeDepositAddresses = idlInstructionAddressesFind(
    expectDefined(programIdl.instructions.get("pledge_deposit")),
    {
      instructionProgramAddress: programAddress,
      instructionAddresses: new Map([
        ["payer", payerAddress],
        ["user", userAddress],
        ["user_collateral", userCollateralAddress],
        ["campaign", campaignAddress],
      ]),
      instructionPayload: {},
      instructionAccountsStates: new Map([
        [
          "campaign",
          { collateral_mint: pubkeyToBase58(collateralMintAddress) },
        ],
      ]),
      instructionAccountsContentsTypeFull: new Map([
        ["campaign", programIdl.accounts.get("Campaign")!.typeFull],
      ]),
    },
  );
  // Check outcome
  expect(campaignCollateralAddress).toStrictEqual(
    pledgeDepositAddresses.get("campaign_collateral"),
  );
  expect(pledgeAddress).toStrictEqual(pledgeDepositAddresses.get("pledge"));
});
