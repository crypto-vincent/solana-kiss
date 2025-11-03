import { expect, it } from "@jest/globals";
import {
  blockHashDefault,
  expectDefined,
  lamportsFeePerSigner,
  Pubkey,
  pubkeyFindPdaAddress,
  pubkeyFromBase58,
  rpcHttpFromUrl,
  rpcHttpGetLatestBlockHash,
  rpcHttpSimulateTransaction,
  Service,
  signerFromSecret,
  signerGenerate,
  transactionCompileAndSign,
  transactionCompileUnsigned,
  urlPublicRpcDevnet,
  utf8Encode,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl(urlPublicRpcDevnet, {
    commitment: "confirmed",
  });
  const service = new Service(rpcHttp);
  const programAddress = pubkeyFromBase58(
    "UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j",
  );
  const payerSigner = await signerFromSecret(secret);
  const userSigner = await signerGenerate();
  const campaignAddress = pubkeyFindPdaAddress(programAddress, [
    utf8Encode("Campaign"),
    new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]),
  ]);
  const instructionAddresses: Record<string, Pubkey> = {
    payer: payerSigner.address,
    user: userSigner.address,
    campaign: campaignAddress,
  };
  const instruction = await service.getAndHydrateAndEncodeInstruction(
    programAddress,
    "pledge_create",
    {
      instructionAddresses: instructionAddresses,
      instructionPayload: { params: null },
    },
  );
  const pledgeAddress = expectDefined(instructionAddresses["pledge"]);
  // Run the simulation without verifying the signers
  const transactionPacketNoVerify = transactionCompileUnsigned({
    payerAddress: payerSigner.address,
    recentBlockHash: blockHashDefault,
    instructions: [instruction],
  });
  const resultNoVerify = await rpcHttpSimulateTransaction(
    rpcHttp,
    transactionPacketNoVerify,
    {
      verifySignaturesAndBlockHash: false,
      simulatedAccountsAddresses: new Set([pledgeAddress]),
    },
  );
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
  const transactionPacketWithVerify = await transactionCompileAndSign(
    [payerSigner, userSigner],
    {
      payerAddress: payerSigner.address,
      recentBlockHash: recentBlockInfo.hash,
      instructions: [instruction],
    },
  );
  const resultWithVerify = await rpcHttpSimulateTransaction(
    rpcHttp,
    transactionPacketWithVerify,
    { simulatedAccountsAddresses: new Set([pledgeAddress]) },
  );
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
