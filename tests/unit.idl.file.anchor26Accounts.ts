import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlInstructionAddressesFind,
  idlProgramParse,
  pubkeyFindPdaAddress,
  pubkeyNewDummy,
  pubkeyToBase58,
  pubkeyToBytes,
  utf8Encode,
} from "../src";

it("run", () => {
  // Parse IDL from file JSON directly
  const programIdl = idlProgramParse(require("./fixtures/idl_anchor_26.json"));
  // Important account addresses
  const programAddress = pubkeyNewDummy();
  const ownerAddress = pubkeyNewDummy();
  const borrowerAddress = pubkeyNewDummy();
  const liquidityPoolTokenAccountAddress = pubkeyNewDummy();
  const treasuryAddress = pubkeyNewDummy();
  const treasuryPoolTokenAccountAddress = pubkeyNewDummy();
  const baseTokenMintAddress = pubkeyNewDummy();
  const placeholderAddress = pubkeyNewDummy();
  // Expected accounts addresses
  const globalMarketSeed = "abcd";
  const globalMarketStateAddress = pubkeyFindPdaAddress(programAddress, [
    utf8Encode(globalMarketSeed),
  ]);
  const marketAdminsAddress = pubkeyFindPdaAddress(programAddress, [
    pubkeyToBytes(globalMarketStateAddress),
    utf8Encode("admins"),
  ]);
  const programStateAddresss = pubkeyFindPdaAddress(programAddress, [
    utf8Encode("program-state"),
  ]);
  const lpTokenMintAddress = pubkeyFindPdaAddress(programAddress, [
    pubkeyToBytes(globalMarketStateAddress),
    utf8Encode("lp-token-mint"),
  ]);
  const signingAuthorityAddress = pubkeyFindPdaAddress(programAddress, [
    pubkeyToBytes(globalMarketStateAddress),
  ]);
  const dealNumber = 77;
  const dealAddress = pubkeyFindPdaAddress(programAddress, [
    pubkeyToBytes(globalMarketStateAddress),
    pubkeyToBytes(borrowerAddress),
    new Uint8Array([dealNumber, 0]),
    utf8Encode("deal-info"),
  ]);
  const dealTranchesAddress = pubkeyFindPdaAddress(programAddress, [
    pubkeyToBytes(globalMarketStateAddress),
    pubkeyToBytes(dealAddress),
    utf8Encode("tranches"),
  ]);
  const repaymentScheduleAddress = pubkeyFindPdaAddress(programAddress, [
    pubkeyToBytes(globalMarketStateAddress),
    pubkeyToBytes(dealAddress),
    utf8Encode("repayment-schedule"),
  ]);
  // Generate all missing IX accounts with just the minimum information
  const initializeMarketAddresses = idlInstructionAddressesFind(
    expectDefined(programIdl.instructions.get("initialize_market")),
    {
      instructionProgramAddress: programAddress,
      instructionAddresses: {
        owner: ownerAddress,
        liquidity_pool_token_account: liquidityPoolTokenAccountAddress,
        treasury: treasuryAddress,
        treasury_pool_token_account: treasuryPoolTokenAccountAddress,
        base_token_mint: baseTokenMintAddress,
        associated_token_program: placeholderAddress,
        rent: placeholderAddress,
        token_program: placeholderAddress,
        system_program: placeholderAddress,
      },
      instructionPayload: {
        global_market_seed: globalMarketSeed,
      },
    },
  );
  // Check the outcomes
  expect(initializeMarketAddresses["global_market_state"]).toStrictEqual(
    globalMarketStateAddress,
  );
  expect(initializeMarketAddresses["market_admins"]).toStrictEqual(
    marketAdminsAddress,
  );
  expect(initializeMarketAddresses["program_state"]).toStrictEqual(
    programStateAddresss,
  );
  expect(initializeMarketAddresses["signing_authority"]).toStrictEqual(
    signingAuthorityAddress,
  );
  expect(initializeMarketAddresses["lp_token_mint"]).toStrictEqual(
    lpTokenMintAddress,
  );
  // Generate all missing IX accounts with just the minimum information
  const openDealAddresses = idlInstructionAddressesFind(
    expectDefined(programIdl.instructions.get("open_deal")),
    {
      instructionProgramAddress: programAddress,
      instructionAddresses: {
        owner: ownerAddress,
        global_market_state: globalMarketStateAddress,
      },
      instructionPayload: { global_market_seed: globalMarketSeed },
      instructionAccountsStates: {
        deal: {
          deal_number: dealNumber,
          borrower: pubkeyToBase58(borrowerAddress),
        },
      },
    },
  );
  // Check the outcomes
  expect(openDealAddresses["market_admins"]).toStrictEqual(marketAdminsAddress);
  expect(openDealAddresses["deal"]).toStrictEqual(dealAddress);
  expect(openDealAddresses["deal_tranches"]).toStrictEqual(dealTranchesAddress);
  expect(openDealAddresses["repayment_schedule"]).toStrictEqual(
    repaymentScheduleAddress,
  );
  expect(openDealAddresses["repayment_schedule"]).toStrictEqual(
    repaymentScheduleAddress,
  );
});
