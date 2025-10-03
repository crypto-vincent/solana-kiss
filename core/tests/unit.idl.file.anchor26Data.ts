import { expect, it } from "@jest/globals";
import {
  idlAccountDecode,
  idlAccountEncode,
  idlInstructionArgsDecode,
  idlInstructionArgsEncode,
  idlProgramParse,
  pubkeyNewDummy,
} from "../src";

it("run", () => {
  // Parse IDL from file JSON directly
  const programIdl = idlProgramParse(require("./fixtures/idl_anchor_26.json"));
  // Prepare instruction args
  const instructionIdl = programIdl.instructions.get("initialize_market")!;
  const instructionPayload = {
    global_market_seed: "SEED",
    withdrawal_fee: {
      numerator: 41,
      denominator: 42,
    },
    credix_fee_percentage: {
      numerator: 51,
      denominator: 52,
    },
    multisig: pubkeyNewDummy(),
    managers: [pubkeyNewDummy(), pubkeyNewDummy()],
    pass_issuers: [pubkeyNewDummy(), pubkeyNewDummy(), pubkeyNewDummy()],
    withdraw_epoch_request_seconds: 22,
    withdraw_epoch_redeem_seconds: 23,
    withdraw_epoch_available_liquidity_seconds: 24,
  };
  // Encode/decode the instruction args and check that they match the original
  const instructionData = idlInstructionArgsEncode(
    instructionIdl,
    instructionPayload,
  );
  expect(
    idlInstructionArgsDecode(instructionIdl, instructionData),
  ).toStrictEqual(instructionPayload);
  // Prepare an account contents
  const marketAccountIdl = programIdl.accounts.get("GlobalMarketState")!;
  const marketAccountState = {
    base_token_mint: pubkeyNewDummy(),
    lp_token_mint: pubkeyNewDummy(),
    pool_outstanding_credit: 5_000_000_000n.toString(),
    treasury_pool_token_account: pubkeyNewDummy(),
    signing_authority_bump: 4,
    bump: 5,
    credix_fee_percentage: {
      numerator: 51,
      denominator: 52,
    },
    withdrawal_fee: {
      numerator: 41,
      denominator: 42,
    },
    frozen: true,
    seed: "Hello World !",
    pool_size_limit_percentage: {
      numerator: 61,
      denominator: 62,
    },
    withdraw_epoch_request_seconds: 0x42_42_42_01,
    withdraw_epoch_redeem_seconds: 0x42_42_42_02,
    withdraw_epoch_available_liquidity_seconds: 0x42_42_42_03,
    latest_withdraw_epoch_idx: 0x42_42_42_04,
    latest_withdraw_epoch_end: (-42).toString(),
    locked_liquidity: 777_777n.toString(),
    total_redeemed_base_amount: 888_888n.toString(),
    has_withdraw_epochs: true,
    redeem_authority_bump: 9,
  };
  // Decode the account content and check that it matches the original
  const accountData = idlAccountEncode(marketAccountIdl, marketAccountState);
  expect(idlAccountDecode(marketAccountIdl, accountData)).toStrictEqual(
    marketAccountState,
  );
  // Prepare an account contents
  const programAccountIdl = programIdl.accounts.get("ProgramState")!;
  const programAccountState = {
    credix_multisig_key: pubkeyNewDummy(),
    credix_managers: [
      pubkeyNewDummy(),
      pubkeyNewDummy(),
      pubkeyNewDummy(),
      pubkeyNewDummy(),
      pubkeyNewDummy(),
      pubkeyNewDummy(),
      pubkeyNewDummy(),
      pubkeyNewDummy(),
      pubkeyNewDummy(),
      pubkeyNewDummy(),
    ],
    credix_treasury: pubkeyNewDummy(),
  };
  // Decode the account content and check that it matches the original
  const programAccountData = idlAccountEncode(
    programAccountIdl,
    programAccountState,
  );
  expect(idlAccountDecode(programAccountIdl, programAccountData)).toStrictEqual(
    programAccountState,
  );
});
