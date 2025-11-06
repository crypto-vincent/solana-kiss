import { expect, it } from "@jest/globals";
import {
  blockHashDefault,
  expectDefined,
  idlInstructionAccountsEncode,
  idlInstructionArgsEncode,
  idlLoaderFromOnchain,
  lamportsFeePerSigner,
  pubkeyDefault,
  pubkeyFindPdaAddress,
  pubkeyFromBase58,
  pubkeyToBytes,
  rpcHttpFromUrl,
  rpcHttpGetAccountWithData,
  rpcHttpGetLatestBlockHash,
  rpcHttpSimulateTransaction,
  signerFromSecret,
  signerGenerate,
  transactionCompileAndSign,
  transactionCompileUnsigned,
  urlRpcPublicDevnet,
  utf8Encode,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl(urlRpcPublicDevnet, {
    commitment: "confirmed",
  });
  // Find the necessary addresses
  const programAddress = pubkeyFromBase58(
    "UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j",
  );
  const payerSigner = await signerFromSecret(secret);
  const userSigner = await signerGenerate();
  const campaignAddress = pubkeyFindPdaAddress(programAddress, [
    utf8Encode("Campaign"),
    new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]),
  ]);
  const pledgeAddress = pubkeyFindPdaAddress(programAddress, [
    utf8Encode("Pledge"),
    pubkeyToBytes(campaignAddress),
    pubkeyToBytes(userSigner.address),
  ]);
  // Find and load the IDL
  const loaderIdl = idlLoaderFromOnchain(async (programAddress) => {
    const { accountInfo } = await rpcHttpGetAccountWithData(
      rpcHttp,
      programAddress,
    );
    return accountInfo.data;
  });
  const programIdl = await loaderIdl(programAddress);
  const instructionIdl = expectDefined(
    programIdl.instructions.get("pledge_create"),
  );
  // Build the instruction
  const instruction = {
    programAddress,
    inputs: idlInstructionAccountsEncode(instructionIdl, {
      payer: payerSigner.address,
      user: userSigner.address,
      campaign: campaignAddress,
      pledge: pledgeAddress,
      system_program: pubkeyDefault,
    }),
    data: idlInstructionArgsEncode(instructionIdl, {
      params: null,
    }),
  };
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
