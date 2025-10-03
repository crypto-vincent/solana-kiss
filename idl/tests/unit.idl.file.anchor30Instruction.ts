import { expect, it } from "@jest/globals";
import {
  Input,
  Pubkey,
  pubkeyFindPdaAddress,
  pubkeyNewDummy,
  pubkeyToBytes,
} from "solana-kiss-data";
import {
  idlInstructionAddressesFind,
  idlInstructionEncode,
  idlProgramParse,
} from "../src";

const systemProgramAddress = "11111111111111111111111111111111";
const tokenProgramAddress = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const ataProgramAddress = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

it("run", () => {
  // Parse IDL from file JSON directly
  const programIdl = idlProgramParse(require("./fixtures/idl_anchor_30.json"));
  // Important account addresses
  const programAddress = pubkeyNewDummy();
  const payerAddress = pubkeyNewDummy();
  const authorityAddress = pubkeyNewDummy();
  const collateralMintAddress = pubkeyNewDummy();
  const redeemableMintAddress = pubkeyNewDummy();
  const campaignAddress = pubkeyFindPdaAddress(programAddress, [
    new TextEncoder().encode("Campaign"),
    new Uint8Array([11, 0, 0, 0, 0, 0, 0, 0]),
  ]);
  // Prepare instruction payload
  const instructionPayloadMetadataBytes = new Array<number>();
  for (let index = 0; index < 512; index++) {
    instructionPayloadMetadataBytes.push(index % 100);
  }
  const instructionPayload = {
    params: {
      index: 11, // TODO - should the library use camelCase only ?
      funding_goal_collateral_amount: 41,
      funding_phase_duration_seconds: 42,
      metadata: {
        length: 22,
        bytes: instructionPayloadMetadataBytes,
      },
    },
  };
  // Prepare instruction known accounts addresses
  const instructionAddressesBefore = new Map([
    ["payer", payerAddress],
    ["authority", authorityAddress],
    ["collateral_mint", collateralMintAddress],
    ["redeemable_mint", redeemableMintAddress],
  ]);
  // Useful instruction
  const instructionIdl = programIdl.instructions.get("campaign_create")!;
  // Resolve missing instruction accounts
  const instructionAddressesAfter = idlInstructionAddressesFind(
    instructionIdl,
    {
      instructionProgramAddress: programAddress,
      instructionAddresses: instructionAddressesBefore,
      instructionPayload,
    },
  );
  // Actually generate the instruction
  const instruction = idlInstructionEncode(
    instructionIdl,
    programAddress,
    instructionAddressesAfter,
    instructionPayload,
  );
  // Generate expected accounts
  const campaignCollateralAddress = pubkeyFindPdaAddress(ataProgramAddress, [
    pubkeyToBytes(campaignAddress),
    pubkeyToBytes(tokenProgramAddress),
    pubkeyToBytes(collateralMintAddress),
  ]);
  // Check instruction content
  expect(programAddress).toStrictEqual(instruction.programAddress);
  // Check instruction data
  expect(8 + 8 + 8 + 4 + 2 + 512).toStrictEqual(instruction.data.length);
  expect(new Uint8Array([11, 0, 0, 0, 0, 0, 0, 0])).toStrictEqual(
    instruction.data.slice(8, 16),
  );
  expect(new Uint8Array([41, 0, 0, 0, 0, 0, 0, 0])).toStrictEqual(
    instruction.data.slice(16, 24),
  );
  expect(new Uint8Array([42, 0, 0, 0])).toStrictEqual(
    instruction.data.slice(24, 28),
  );
  expect(new Uint8Array([22, 0])).toStrictEqual(instruction.data.slice(28, 30));
  // Check instruction accounts
  expect(9).toStrictEqual(instruction.inputs.length);
  expectInput(instruction.inputs[0], payerAddress, true, true);
  expectInput(instruction.inputs[1], authorityAddress, true, false);
  expectInput(instruction.inputs[2], campaignAddress, false, true);
  expectInput(instruction.inputs[3], campaignCollateralAddress, false, true);
  expectInput(instruction.inputs[4], collateralMintAddress, false, false);
  expectInput(instruction.inputs[5], redeemableMintAddress, true, true);
  expectInput(instruction.inputs[6], ataProgramAddress, false, false);
  expectInput(instruction.inputs[7], tokenProgramAddress, false, false);
  expectInput(instruction.inputs[8], systemProgramAddress, false, false);
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
