import {
  idlInstructionAddressesFind,
  idlInstructionAddressesFindWithAccounts,
  idlProgramParse,
  pubkeyFindPdaAddress,
  pubkeyNewDummy,
  pubkeyToBytes,
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
    new TextEncoder().encode(globalMarketSeed),
  ]);
  const marketAdminsAddress = pubkeyFindPdaAddress(programAddress, [
    pubkeyToBytes(globalMarketStateAddress),
    new TextEncoder().encode("admins"),
  ]);
  const programStateAddresss = pubkeyFindPdaAddress(programAddress, [
    new TextEncoder().encode("program-state"),
  ]);
  const lpTokenMintAddress = pubkeyFindPdaAddress(programAddress, [
    pubkeyToBytes(globalMarketStateAddress),
    new TextEncoder().encode("lp-token-mint"),
  ]);
  const signingAuthorityAddress = pubkeyFindPdaAddress(programAddress, [
    pubkeyToBytes(globalMarketStateAddress),
  ]);
  const dealNumber = 77;
  const dealAddress = pubkeyFindPdaAddress(programAddress, [
    pubkeyToBytes(globalMarketStateAddress),
    pubkeyToBytes(borrowerAddress),
    new Uint8Array([dealNumber, 0]),
    new TextEncoder().encode("deal-info"),
  ]);
  const dealTranchesAddress = pubkeyFindPdaAddress(programAddress, [
    pubkeyToBytes(globalMarketStateAddress),
    pubkeyToBytes(dealAddress),
    new TextEncoder().encode("tranches"),
  ]);
  const repaymentScheduleAddress = pubkeyFindPdaAddress(programAddress, [
    pubkeyToBytes(globalMarketStateAddress),
    pubkeyToBytes(dealAddress),
    new TextEncoder().encode("repayment-schedule"),
  ]);
  // Generate all missing IX accounts with just the minimum information
  const initializeMarketAddresses = idlInstructionAddressesFind(
    programIdl.instructions.get("initialize_market")!,
    programAddress,
    new Map([
      ["owner", ownerAddress],
      ["liquidity_pool_token_account", liquidityPoolTokenAccountAddress],
      ["treasury", treasuryAddress],
      ["treasury_pool_token_account", treasuryPoolTokenAccountAddress],
      ["base_token_mint", baseTokenMintAddress],
      ["associated_token_program", placeholderAddress],
      ["rent", placeholderAddress],
      ["token_program", placeholderAddress],
      ["system_program", placeholderAddress],
    ]),
    { global_market_seed: globalMarketSeed },
  );
  // Check the outcomes
  expect(initializeMarketAddresses.get("global_market_state")!).toStrictEqual(
    globalMarketStateAddress,
  );
  expect(initializeMarketAddresses.get("market_admins")).toStrictEqual(
    marketAdminsAddress,
  );
  expect(initializeMarketAddresses.get("program_state")).toStrictEqual(
    programStateAddresss,
  );
  expect(initializeMarketAddresses.get("signing_authority")).toStrictEqual(
    signingAuthorityAddress,
  );
  expect(initializeMarketAddresses.get("lp_token_mint")).toStrictEqual(
    lpTokenMintAddress,
  );
  // Generate all missing IX accounts with just the minimum information
  const openDealAddresses = idlInstructionAddressesFindWithAccounts(
    programIdl.instructions.get("open_deal")!,
    programAddress,
    new Map([
      ["owner", ownerAddress],
      ["global_market_state", globalMarketStateAddress],
    ]),
    { global_market_seed: globalMarketSeed },
    new Map([["deal", { deal_number: dealNumber, borrower: borrowerAddress }]]),
    new Map(),
  );
  // Check the outcomes
  expect(openDealAddresses.get("market_admins")).toStrictEqual(
    marketAdminsAddress,
  );
  expect(openDealAddresses.get("deal")).toStrictEqual(dealAddress);
  expect(openDealAddresses.get("deal_tranches")).toStrictEqual(
    dealTranchesAddress,
  );
  expect(openDealAddresses.get("deal_tranches")).toStrictEqual(
    dealTranchesAddress,
  );
  expect(openDealAddresses.get("repayment_schedule")).toStrictEqual(
    repaymentScheduleAddress,
  );
});
