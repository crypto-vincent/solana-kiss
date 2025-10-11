import { it } from "@jest/globals";
import {
  expectDefined,
  idlInstructionAddressesFind,
  idlInstructionEncode,
  idlOnchainAnchorAddress,
  idlOnchainAnchorDecode,
  lamportsFeePerSigner,
  pubkeyFindPdaAddress,
  pubkeyFromBase58,
  rpcHttpFromUrl,
  rpcHttpGetAccountWithData,
  rpcHttpGetLatestBlockHash,
  rpcHttpSimulateInstructions,
  signerFromSecret,
  signerGenerate,
  utf8Encode,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com", {
    commitment: "confirmed",
  });
  const programAddress = pubkeyFromBase58(
    "UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j",
  );
  const { accountInfo: programOnchainAnchorInfo } =
    await rpcHttpGetAccountWithData(
      rpcHttp,
      idlOnchainAnchorAddress(programAddress),
    );
  const programIdl = idlOnchainAnchorDecode(programOnchainAnchorInfo.data);
  const instructionIdl = expectDefined(
    programIdl.instructions.get("pledge_create"),
  );
  const payerSigner = await signerFromSecret(secret);
  const userSigner = await signerGenerate();
  const campaignAddress = pubkeyFindPdaAddress(programAddress, [
    utf8Encode("Campaign"),
    new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]),
  ]);
  const instructionPayload = { params: null };
  const instructionAddresses = idlInstructionAddressesFind(instructionIdl, {
    instructionProgramAddress: programAddress,
    instructionAddresses: new Map([
      ["payer", payerSigner.address],
      ["user", userSigner.address],
      ["campaign", campaignAddress],
    ]),
    instructionPayload,
  });
  const instruction = idlInstructionEncode(
    instructionIdl,
    programAddress,
    instructionAddresses,
    instructionPayload,
  );
  const pledgeAddress = expectDefined(instructionAddresses.get("pledge"));
  // Run the simulation without verifying the signers
  const resultNoVerify = await rpcHttpSimulateInstructions(
    rpcHttp,
    [instruction],
    { payerAddress: payerSigner.address },
    { simulatedAccountsAddresses: new Set([pledgeAddress]) },
  );
  expect(
    resultNoVerify.transactionExecution.message.payerAddress,
  ).toStrictEqual(payerSigner.address);
  expect(resultNoVerify.transactionExecution.error).toStrictEqual(null);
  expect(resultNoVerify.transactionExecution.logs?.length).toStrictEqual(6);
  expect(resultNoVerify.transactionExecution.chargedFeesLamports).toStrictEqual(
    lamportsFeePerSigner * 2n,
  );
  expect(
    resultNoVerify.transactionExecution.consumedComputeUnits,
  ).toBeGreaterThan(0);
  const pledgeAccountNoVerify = expectDefined(
    resultNoVerify.simulatedAccountInfoByAddress.get(pledgeAddress),
  );
  expect(pledgeAccountNoVerify.owner).toStrictEqual(programAddress);
  expect(pledgeAccountNoVerify.lamports).toBeGreaterThan(0n);
  expect(pledgeAccountNoVerify.data.length).toBeGreaterThan(0);
  expect(pledgeAccountNoVerify.executable).toStrictEqual(false);
  // Run the simulation with verifying the signers (and recent block hash)
  const { blockInfo: recentBlockInfo } =
    await rpcHttpGetLatestBlockHash(rpcHttp);
  const resultWithVerify = await rpcHttpSimulateInstructions(
    rpcHttp,
    [instruction],
    {
      payerSigner,
      extraSigners: [userSigner],
      recentBlockHash: recentBlockInfo.hash,
    },
    { simulatedAccountsAddresses: new Set([pledgeAddress]) },
  );
  expect(
    resultWithVerify.transactionExecution.message.payerAddress,
  ).toStrictEqual(payerSigner.address);
  expect(
    resultWithVerify.transactionExecution.message.recentBlockHash,
  ).toStrictEqual(recentBlockInfo.hash);
  expect(resultWithVerify.transactionExecution.error).toStrictEqual(null);
  expect(resultWithVerify.transactionExecution.logs?.length).toStrictEqual(6);
  expect(
    resultWithVerify.transactionExecution.chargedFeesLamports,
  ).toStrictEqual(lamportsFeePerSigner * 2n);
  expect(
    resultWithVerify.transactionExecution.consumedComputeUnits,
  ).toBeGreaterThan(0);
  expect(resultWithVerify.simulatedAccountInfoByAddress.size).toStrictEqual(1);
  const pledgeAccountWithVerify = expectDefined(
    resultWithVerify.simulatedAccountInfoByAddress.get(pledgeAddress),
  );
  expect(pledgeAccountWithVerify.owner).toStrictEqual(programAddress);
  expect(pledgeAccountWithVerify.lamports).toBeGreaterThan(0n);
  expect(pledgeAccountWithVerify.data.length).toBeGreaterThan(0);
  expect(pledgeAccountWithVerify.executable).toStrictEqual(false);
});

const secret = new Uint8Array([
  96, 11, 209, 132, 49, 92, 144, 135, 105, 211, 34, 171, 125, 156, 217, 148, 65,
  233, 239, 86, 149, 37, 180, 226, 120, 139, 152, 126, 199, 116, 104, 184, 10,
  85, 215, 5, 230, 110, 192, 255, 29, 27, 96, 27, 203, 56, 119, 189, 226, 99,
  13, 150, 68, 70, 138, 190, 182, 126, 125, 69, 25, 66, 190, 239,
]);
