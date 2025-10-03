import { expect, it } from "@jest/globals";
import {
  idlInstructionAddressesFind,
  idlInstructionAddressesFindWithAccounts,
  idlProgramParse,
  pubkeyFindPdaAddress,
  pubkeyNewDummy,
  pubkeyToBytes,
} from "../src";

const tokenProgramAddress = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const ataProgramAddress = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

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
    new TextEncoder().encode("Campaign"),
    new Uint8Array([campaignIndex, 0, 0, 0, 0, 0, 0, 0]),
  ]);
  const campaignCollateralAddress = pubkeyFindPdaAddress(ataProgramAddress, [
    pubkeyToBytes(campaignAddress),
    pubkeyToBytes(tokenProgramAddress),
    pubkeyToBytes(collateralMintAddress),
  ]);
  const pledgeAddress = pubkeyFindPdaAddress(programAddress, [
    new TextEncoder().encode("Pledge"),
    pubkeyToBytes(campaignAddress),
    pubkeyToBytes(userAddress),
  ]);
  // Generate all missing IX accounts with just the minimum information
  const campaignCreateAddresses = idlInstructionAddressesFind(
    programIdl.instructions.get("campaign_create")!,
    programAddress,
    new Map([
      ["payer", payerAddress],
      ["authority", authorityAddress],
      ["collateral_mint", collateralMintAddress],
      ["redeemable_mint", redeemableMintAddress],
    ]),
    { params: { index: campaignIndex } },
  );
  // Check outcome
  expect(campaignAddress).toStrictEqual(
    campaignCreateAddresses.get("campaign"),
  );
  expect(campaignCollateralAddress).toStrictEqual(
    campaignCreateAddresses.get("campaign_collateral"),
  );
  // Generate all missing IX accounts with just the minimum information
  const campaignExtractAddresses = idlInstructionAddressesFindWithAccounts(
    programIdl.instructions.get("campaign_extract")!,
    programAddress,
    new Map([
      ["payer", payerAddress],
      ["authority", authorityAddress],
      ["authority_collateral", authorityCollateralAddress],
      ["campaign", campaignAddress],
    ]),
    { params: { index: campaignIndex } },
    new Map([["campaign", { collateral_mint: collateralMintAddress }]]),
    new Map([
      ["campaign", programIdl.accounts.get("Campaign")!.contentTypeFull],
    ]),
  );
  // Check outcome
  expect(campaignCollateralAddress).toStrictEqual(
    campaignExtractAddresses.get("campaign_collateral"),
  );
  // Generate all missing IX accounts with just the minimum information
  const pledgeCreateAddresses = idlInstructionAddressesFind(
    programIdl.instructions.get("pledge_create")!,
    programAddress,
    new Map([
      ["payer", payerAddress],
      ["user", userAddress],
      ["campaign", campaignAddress],
    ]),
    {},
  );
  // Check outcome
  expect(pledgeAddress).toStrictEqual(pledgeCreateAddresses.get("pledge"));
  // Generate all missing IX accounts with just the minimum information
  const pledgeDepositAddresses = idlInstructionAddressesFindWithAccounts(
    programIdl.instructions.get("pledge_deposit")!,
    programAddress,
    new Map([
      ["payer", payerAddress],
      ["user", userAddress],
      ["user_collateral", userCollateralAddress],
      ["campaign", campaignAddress],
    ]),
    {},
    new Map([["campaign", { collateral_mint: collateralMintAddress }]]),
    new Map([
      ["campaign", programIdl.accounts.get("Campaign")!.contentTypeFull],
    ]),
  );
  // Check outcome
  expect(campaignCollateralAddress).toStrictEqual(
    pledgeDepositAddresses.get("campaign_collateral"),
  );
  expect(pledgeAddress).toStrictEqual(pledgeDepositAddresses.get("pledge"));
});
