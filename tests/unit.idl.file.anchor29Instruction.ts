import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlInstructionAccountsEncode,
  idlInstructionArgsEncode,
  idlProgramParse,
  InstructionInput,
  Pubkey,
  pubkeyNewDummy,
} from "../src";

it("run", () => {
  // Parse IDL from file JSON directly
  const programIdl = idlProgramParse(require("./fixtures/idl_anchor_29.json"));
  // Important account addresses
  const payerAddress = pubkeyNewDummy();
  const fundingAddress = pubkeyNewDummy();
  const placeholderAddress = pubkeyNewDummy();
  // Tested instruction
  const instructionIdl = expectDefined(
    programIdl.instructions.get("initialize_realm"),
  );
  // Check instruction accounts encoding
  const instructionInputs = idlInstructionAccountsEncode(instructionIdl, {
    payer: payerAddress,
    funding: fundingAddress,
    funding_usdc: placeholderAddress,
    realm: placeholderAddress,
    realm_usdc: placeholderAddress,
    uct_mint: placeholderAddress,
    uxp_mint: placeholderAddress,
    usdc_mint: placeholderAddress,
    authority: placeholderAddress,
    spill: placeholderAddress,
    system_program: placeholderAddress,
    token_program: placeholderAddress,
  });
  expect(12).toStrictEqual(instructionInputs.length);
  expectInput(instructionInputs[0], payerAddress, true, true);
  expectInput(instructionInputs[1], fundingAddress, true, false);
  expectInput(instructionInputs[2], placeholderAddress, false, true);
  expectInput(instructionInputs[3], placeholderAddress, false, true);
  expectInput(instructionInputs[4], placeholderAddress, false, true);
  expectInput(instructionInputs[5], placeholderAddress, false, true);
  expectInput(instructionInputs[6], placeholderAddress, false, false);
  expectInput(instructionInputs[7], placeholderAddress, false, false);
  expectInput(instructionInputs[8], placeholderAddress, false, false);
  expectInput(instructionInputs[9], placeholderAddress, false, false);
  expectInput(instructionInputs[10], placeholderAddress, false, false);
  expectInput(instructionInputs[11], placeholderAddress, false, false);
  // Check instruction data encoding
  const instructionData = idlInstructionArgsEncode(instructionIdl, {
    params: {
      liquid_insurance_fund_usdc_amount: 41,
      phase_one_duration_seconds: 42,
      phase_two_duration_seconds: 43,
    },
  });
  expect(8 + 8 + 8 + 8).toStrictEqual(instructionData.length);
  expect(new Uint8Array([41, 0, 0, 0, 0, 0, 0, 0])).toStrictEqual(
    instructionData.slice(8, 16),
  );
  expect(new Uint8Array([42, 0, 0, 0, 0, 0, 0, 0])).toStrictEqual(
    instructionData.slice(16, 24),
  );
  expect(new Uint8Array([43, 0, 0, 0, 0, 0, 0, 0])).toStrictEqual(
    instructionData.slice(24, 32),
  );
});

function expectInput(
  instructionInput: InstructionInput | undefined,
  address: Pubkey,
  signer: boolean,
  writable: boolean,
) {
  expect(instructionInput).toStrictEqual({
    address,
    signer,
    writable,
  });
}
