import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlInstructionAddressesHydrate,
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

it("run", async () => {
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
  const accountsContext = {
    campaign: {
      accountTypeFull: programIdl.accounts.get("Campaign")?.typeFull,
      accountState: {
        collateralMint: pubkeyToBase58(collateralMintAddress),
      },
    },
  };
  // Generate all missing IX accounts with just the minimum information
  const { instructionAddresses: campaignCreateAddresses } =
    await idlInstructionAddressesHydrate(
      expectDefined(programIdl.instructions.get("campaign_create")),
      programAddress,
      {
        addresses: {
          payer: payerAddress,
          authority: authorityAddress,
          collateral_mint: collateralMintAddress,
          redeemable_mint: redeemableMintAddress,
        },
        payload: {
          params: { index: campaignIndex },
        },
      },
      { accountsContext },
    );
  // Check outcome
  expect(campaignCreateAddresses["campaign"]).toStrictEqual(campaignAddress);
  expect(campaignCreateAddresses["campaign_collateral"]).toStrictEqual(
    campaignCollateralAddress,
  );
  // Generate all missing IX accounts with just the minimum information
  const { instructionAddresses: campaignExtractAddresses } =
    await idlInstructionAddressesHydrate(
      expectDefined(programIdl.instructions.get("campaign_extract")),
      programAddress,
      {
        addresses: {
          payer: payerAddress,
          authority: authorityAddress,
          authority_collateral: authorityCollateralAddress,
          campaign: campaignAddress,
        },
        payload: { params: { index: campaignIndex } },
      },
      { accountsContext },
    );
  // Check outcome
  expect(campaignExtractAddresses["campaign_collateral"]).toStrictEqual(
    campaignCollateralAddress,
  );
  // Generate all missing IX accounts with just the minimum information
  const { instructionAddresses: pledgeCreateAddresses } =
    await idlInstructionAddressesHydrate(
      expectDefined(programIdl.instructions.get("pledge_create")),
      programAddress,
      {
        addresses: {
          payer: payerAddress,
          user: userAddress,
          campaign: campaignAddress,
        },
      },
    );
  // Check outcome
  expect(pledgeCreateAddresses["pledge"]).toStrictEqual(pledgeAddress);
  // Generate all missing IX accounts with just the minimum information
  const { instructionAddresses: pledgeDepositAddresses } =
    await idlInstructionAddressesHydrate(
      expectDefined(programIdl.instructions.get("pledge_deposit")),
      programAddress,
      {
        addresses: {
          payer: payerAddress,
          user: userAddress,
          user_collateral: userCollateralAddress,
          campaign: campaignAddress,
        },
      },
      { accountsContext },
    );
  // Check outcome
  expect(pledgeDepositAddresses["campaign_collateral"]).toStrictEqual(
    campaignCollateralAddress,
  );
  expect(pledgeDepositAddresses["pledge"]).toStrictEqual(pledgeAddress);
});
