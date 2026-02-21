import { expect, it } from "@jest/globals";
import {
  expectDefined,
  lamportsFeePerSignature,
  pubkeyFromBase58,
  signerFromSecret,
  signerGenerate,
  Solana,
} from "../src";

it("run", async () => {
  const solana = new Solana("devnet");
  const programAddress = pubkeyFromBase58(
    "UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j",
  );
  const payerSigner = await signerFromSecret(secret);
  const userSigner = await signerGenerate();
  // Resolve the necessary addresses
  const { instructionAddresses: campaignCreateAddresses } =
    await solana.hydrateInstructionAddresses(
      programAddress,
      "campaign_create",
      { instructionPayload: { params: { index: "0" } } },
    );
  const campaignAddress = expectDefined(campaignCreateAddresses["campaign"]);
  const { instructionAddresses: pledgeCreateAddresses } =
    await solana.hydrateInstructionAddresses(programAddress, "pledge_create", {
      instructionAddresses: {
        user: userSigner.address,
        campaign: campaignAddress,
      },
    });
  const pledgeAddress = expectDefined(pledgeCreateAddresses["pledge"]);
  // Run the simulation without verifying the signers
  const { instructionRequest } = await solana.hydrateAndEncodeInstruction(
    programAddress,
    "pledge_create",
    {
      instructionAddresses: {
        payer: payerSigner.address,
        user: userSigner.address,
        campaign: campaignAddress,
      },
      instructionPayload: {
        params: null,
      },
    },
  );
  const resultNoVerify = await solana.prepareAndSimulateTransaction(
    payerSigner.address,
    [instructionRequest],
    {
      verifySignaturesAndBlockHash: false,
      simulatedAccountsAddresses: new Set([pledgeAddress]),
    },
  );
  expect(resultNoVerify.transactionExecution.transactionError).toStrictEqual(
    null,
  );
  expect(
    resultNoVerify.transactionExecution.transactionLogs?.length,
  ).toStrictEqual(6);
  expect(resultNoVerify.transactionExecution.chargedFeesLamports).toStrictEqual(
    lamportsFeePerSignature * 2n,
  );
  expect(
    resultNoVerify.transactionExecution.consumedComputeUnits,
  ).toBeGreaterThan(0);
  const pledgeAccountNoVerify = expectDefined(
    resultNoVerify.simulatedAccountsByAddress.get(pledgeAddress),
  );
  expect(pledgeAccountNoVerify.programAddress).toStrictEqual(programAddress);
  expect(pledgeAccountNoVerify.accountLamports).toBeGreaterThan(0n);
  expect(pledgeAccountNoVerify.accountData.length).toBeGreaterThan(0);
  expect(pledgeAccountNoVerify.accountExecutable).toStrictEqual(false);
  expect(
    (await solana.getAndInferAndDecodeAccount(pledgeAddress)).accountData
      .length,
  ).toStrictEqual(0);
  // Run the simulation with verifying the signers (and recent block hash)
  const resultWithVerify = await solana.prepareAndSimulateTransaction(
    payerSigner,
    [instructionRequest],
    {
      extraSigners: [userSigner],
      verifySignaturesAndBlockHash: true,
      simulatedAccountsAddresses: new Set([pledgeAddress]),
    },
  );
  expect(resultWithVerify.transactionExecution.transactionError).toStrictEqual(
    null,
  );
  expect(
    resultWithVerify.transactionExecution.transactionLogs?.length,
  ).toStrictEqual(6);
  expect(
    resultWithVerify.transactionExecution.chargedFeesLamports,
  ).toStrictEqual(lamportsFeePerSignature * 2n);
  expect(
    resultWithVerify.transactionExecution.consumedComputeUnits,
  ).toBeGreaterThan(0);
  expect(resultWithVerify.simulatedAccountsByAddress.size).toStrictEqual(1);
  const pledgeAccountWithVerify = expectDefined(
    resultWithVerify.simulatedAccountsByAddress.get(pledgeAddress),
  );
  expect(pledgeAccountWithVerify.programAddress).toStrictEqual(programAddress);
  expect(pledgeAccountWithVerify.accountExecutable).toStrictEqual(false);
  expect(pledgeAccountWithVerify.accountLamports).toBeGreaterThan(0n);
  expect(pledgeAccountWithVerify.accountData.length).toBeGreaterThan(0);
  expect(
    (await solana.getAndInferAndDecodeAccount(pledgeAddress)).accountData
      .length,
  ).toStrictEqual(0);
});

const secret = new Uint8Array([
  96, 11, 209, 132, 49, 92, 144, 135, 105, 211, 34, 171, 125, 156, 217, 148, 65,
  233, 239, 86, 149, 37, 180, 226, 120, 139, 152, 126, 199, 116, 104, 184, 10,
  85, 215, 5, 230, 110, 192, 255, 29, 27, 96, 27, 203, 56, 119, 189, 226, 99,
  13, 150, 68, 70, 138, 190, 182, 126, 125, 69, 25, 66, 190, 239,
]);
