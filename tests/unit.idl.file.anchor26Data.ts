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
  const programIdl = idlProgramParse(require("./fixtures/idl_anchor_26.json"));
  // Prepare instruction args
  const instructionIdl = expectDefined(
    programIdl.instructions.get("initialize_market"),
  );
  const instructionPayload = {
    globalMarketSeed: "SEED",
    withdrawalFee: {
      numerator: 41,
      denominator: 42,
    },
    credixFeePercentage: {
      numerator: 51,
      denominator: 52,
    },
    multisig: pubkeyToBase58(pubkeyNewDummy()),
    managers: [
      pubkeyToBase58(pubkeyNewDummy()),
      pubkeyToBase58(pubkeyNewDummy()),
    ],
    passIssuers: [
      pubkeyToBase58(pubkeyNewDummy()),
      pubkeyToBase58(pubkeyNewDummy()),
      pubkeyToBase58(pubkeyNewDummy()),
    ],
    withdrawEpochRequestSeconds: 22,
    withdrawEpochRedeemSeconds: 23,
    withdrawEpochAvailableLiquiditySeconds: 24,
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
  const marketAccountIdl = expectDefined(
    programIdl.accounts.get("GlobalMarketState"),
  );
  const marketAccountState = {
    baseTokenMint: pubkeyToBase58(pubkeyNewDummy()),
    lpTokenMint: pubkeyToBase58(pubkeyNewDummy()),
    poolOutstandingCredit: 5_000_000_000n.toString(),
    treasuryPoolTokenAccount: pubkeyToBase58(pubkeyNewDummy()),
    signingAuthorityBump: 4,
    bump: 5,
    credixFeePercentage: {
      numerator: 51,
      denominator: 52,
    },
    withdrawalFee: {
      numerator: 41,
      denominator: 42,
    },
    frozen: true,
    seed: "Hello World !",
    poolSizeLimitPercentage: {
      numerator: 61,
      denominator: 62,
    },
    withdrawEpochRequestSeconds: 0x42_42_42_01,
    withdrawEpochRedeemSeconds: 0x42_42_42_02,
    withdrawEpochAvailableLiquiditySeconds: 0x42_42_42_03,
    latestWithdrawEpochIdx: 0x42_42_42_04,
    latestWithdrawEpochEnd: (-42).toString(),
    lockedLiquidity: 777_777n.toString(),
    totalRedeemedBaseAmount: 888_888n.toString(),
    hasWithdrawEpochs: true,
    redeemAuthorityBump: 9,
  };
  // Decode the account content and check that it matches the original
  const accountData = idlAccountEncode(marketAccountIdl, marketAccountState);
  expect(idlAccountDecode(marketAccountIdl, accountData)).toStrictEqual(
    marketAccountState,
  );
  // Prepare an account contents
  const programAccountIdl = expectDefined(
    programIdl.accounts.get("ProgramState"),
  );
  const programAccountState = {
    credixMultisigKey: pubkeyToBase58(pubkeyNewDummy()),
    credixManagers: [
      pubkeyToBase58(pubkeyNewDummy()),
      pubkeyToBase58(pubkeyNewDummy()),
      pubkeyToBase58(pubkeyNewDummy()),
      pubkeyToBase58(pubkeyNewDummy()),
      pubkeyToBase58(pubkeyNewDummy()),
      pubkeyToBase58(pubkeyNewDummy()),
      pubkeyToBase58(pubkeyNewDummy()),
      pubkeyToBase58(pubkeyNewDummy()),
      pubkeyToBase58(pubkeyNewDummy()),
      pubkeyToBase58(pubkeyNewDummy()),
    ],
    credixTreasury: pubkeyToBase58(pubkeyNewDummy()),
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
