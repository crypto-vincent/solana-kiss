import { expect, it } from "@jest/globals";
import { Input, Pubkey, pubkeyNewDummy } from "solana-kiss-data";
import { idlInstructionEncode, idlProgramParse } from "../src";

it("run", () => {
  // Parse IDL from file JSON directly
  const programIdl = idlProgramParse(require("./fixtures/idl_anchor_29.json"));
  // Important account addresses
  const programAddress = pubkeyNewDummy();
  const payerAddress = pubkeyNewDummy();
  const fundingAddress = pubkeyNewDummy();
  const placeholderAddress = pubkeyNewDummy();
  // Actually generate the instruction
  const instruction = idlInstructionEncode(
    programIdl.instructions.get("initialize_realm")!,
    programAddress,
    new Map([
      ["payer", payerAddress],
      ["funding", fundingAddress],
      ["funding_usdc", placeholderAddress],
      ["realm", placeholderAddress],
      ["realm_usdc", placeholderAddress],
      ["uct_mint", placeholderAddress],
      ["uxp_mint", placeholderAddress],
      ["usdc_mint", placeholderAddress],
      ["authority", placeholderAddress],
      ["spill", placeholderAddress],
      ["system_program", placeholderAddress],
      ["token_program", placeholderAddress],
    ]),
    {
      params: {
        liquid_insurance_fund_usdc_amount: 41,
        phase_one_duration_seconds: 42,
        phase_two_duration_seconds: 43,
      },
    },
  );
  // Check instruction content
  expect(programAddress).toStrictEqual(instruction.programAddress);
  // Check instruction data
  expect(8 + 8 + 8 + 8).toStrictEqual(instruction.data.length);
  expect(new Uint8Array([41, 0, 0, 0, 0, 0, 0, 0])).toStrictEqual(
    instruction.data.slice(8, 16),
  );
  expect(new Uint8Array([42, 0, 0, 0, 0, 0, 0, 0])).toStrictEqual(
    instruction.data.slice(16, 24),
  );
  expect(new Uint8Array([43, 0, 0, 0, 0, 0, 0, 0])).toStrictEqual(
    instruction.data.slice(24, 32),
  );
  // Check instruction accounts
  expect(12).toStrictEqual(instruction.inputs.length);
  expectInput(instruction.inputs[0], payerAddress, true, true);
  expectInput(instruction.inputs[1], fundingAddress, true, false);
  expectInput(instruction.inputs[2], placeholderAddress, false, true);
  expectInput(instruction.inputs[3], placeholderAddress, false, true);
  expectInput(instruction.inputs[4], placeholderAddress, false, true);
  expectInput(instruction.inputs[5], placeholderAddress, false, true);
  expectInput(instruction.inputs[6], placeholderAddress, false, false);
  expectInput(instruction.inputs[7], placeholderAddress, false, false);
  expectInput(instruction.inputs[8], placeholderAddress, false, false);
  expectInput(instruction.inputs[9], placeholderAddress, false, false);
  expectInput(instruction.inputs[10], placeholderAddress, false, false);
  expectInput(instruction.inputs[11], placeholderAddress, false, false);
});

function expectInput(
  input: Input | undefined,
  address: Pubkey,
  signing: boolean,
  writable: boolean,
) {
  expect(input).toStrictEqual({
    address,
    signing,
    writable,
  });
}
