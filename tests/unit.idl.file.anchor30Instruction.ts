import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlInstructionAccountsEncode,
  idlInstructionAddressesHydrate,
  idlInstructionArgsEncode,
  idlProgramParse,
  InstructionInput,
  Pubkey,
  pubkeyDefault,
  pubkeyFindPdaAddress,
  pubkeyFromBase58,
  pubkeyNewDummy,
  pubkeyToBytes,
  utf8Encode,
} from "../src";

const systemProgramAddress = pubkeyDefault;
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
  const collateralMintAddress = pubkeyNewDummy();
  const redeemableMintAddress = pubkeyNewDummy();
  const campaignAddress = pubkeyFindPdaAddress(programAddress, [
    utf8Encode("Campaign"),
    new Uint8Array([11, 0, 0, 0, 0, 0, 0, 0]),
  ]);
  // Tested instruction
  const instructionIdl = expectDefined(
    programIdl.instructions.get("campaign_create"),
  );
  // Prepare instruction payload
  const instructionPayloadMetadataBytes = new Array<number>();
  for (let index = 0; index < 512; index++) {
    instructionPayloadMetadataBytes.push(index % 100);
  }
  const instructionPayload = {
    params: {
      index: 11,
      fundingGoalCollateralAmount: 41,
      fundingPhaseDurationSeconds: 42,
      metadata: {
        length: 22,
        bytes: instructionPayloadMetadataBytes,
      },
    },
  };
  // Resolve missing instruction accounts
  const instructionAddresses = await idlInstructionAddressesHydrate(
    instructionIdl,
    programAddress,
    {
      instructionAddresses: {
        payer: payerAddress,
        authority: authorityAddress,
        collateral_mint: collateralMintAddress,
        redeemable_mint: redeemableMintAddress,
      },
      instructionPayload,
    },
  );
  // Generate expected accounts
  const campaignCollateralAddress = pubkeyFindPdaAddress(ataProgramAddress, [
    pubkeyToBytes(campaignAddress),
    pubkeyToBytes(tokenProgramAddress),
    pubkeyToBytes(collateralMintAddress),
  ]);
  // Check instruction accounts encoding
  const instructionInputs = idlInstructionAccountsEncode(
    instructionIdl,
    instructionAddresses,
  );
  expect(9).toStrictEqual(instructionInputs.length);
  expectInput(instructionInputs[0], payerAddress, true, true);
  expectInput(instructionInputs[1], authorityAddress, true, false);
  expectInput(instructionInputs[2], campaignAddress, false, true);
  expectInput(instructionInputs[3], campaignCollateralAddress, false, true);
  expectInput(instructionInputs[4], collateralMintAddress, false, false);
  expectInput(instructionInputs[5], redeemableMintAddress, true, true);
  expectInput(instructionInputs[6], ataProgramAddress, false, false);
  expectInput(instructionInputs[7], tokenProgramAddress, false, false);
  expectInput(instructionInputs[8], systemProgramAddress, false, false);
  // Check instruction data encoding
  const instructionData = idlInstructionArgsEncode(
    instructionIdl,
    instructionPayload,
  );
  expect(8 + 8 + 8 + 4 + 2 + 512).toStrictEqual(instructionData.length);
  expect(new Uint8Array([11, 0, 0, 0, 0, 0, 0, 0])).toStrictEqual(
    instructionData.slice(8, 16),
  );
  expect(new Uint8Array([41, 0, 0, 0, 0, 0, 0, 0])).toStrictEqual(
    instructionData.slice(16, 24),
  );
  expect(new Uint8Array([42, 0, 0, 0])).toStrictEqual(
    instructionData.slice(24, 28),
  );
  expect(new Uint8Array([22, 0])).toStrictEqual(instructionData.slice(28, 30));
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
