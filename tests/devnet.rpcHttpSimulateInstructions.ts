import { it } from "@jest/globals";
import {
  idlInstructionAddressesFind,
  idlInstructionEncode,
  idlOnchainAnchorAddress,
  idlOnchainAnchorDeserialize,
  lamportsFeePerSigner,
  pubkeyFindPdaAddress,
  pubkeyFromBase58,
  rpcHttpFromUrl,
  rpcHttpGetAccountWithData,
  rpcHttpGetLatestBlockHash,
  rpcHttpSimulateInstructions,
  signerFromSecret,
  signerGenerate,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com", {
    commitment: "confirmed",
  });
  const programAddress = pubkeyFromBase58(
    "UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j",
  );
  const programOnchainAnchorInfo = await rpcHttpGetAccountWithData(
    rpcHttp,
    idlOnchainAnchorAddress(programAddress),
  );
  const programIdl = idlOnchainAnchorDeserialize(programOnchainAnchorInfo.data);
  const instructionIdl = programIdl.instructions.get("pledge_create")!;
  const payerSigner = await signerFromSecret(secret);
  const userSigner = await signerGenerate();
  const campaignAddress = pubkeyFindPdaAddress(programAddress, [
    new TextEncoder().encode("Campaign"),
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
  const resultNoVerify = await rpcHttpSimulateInstructions(
    rpcHttp,
    [instruction],
    { payerAddress: payerSigner.address },
  );
  expect(resultNoVerify.message.payerAddress).toStrictEqual(
    payerSigner.address,
  );
  expect(resultNoVerify.error).toStrictEqual(null);
  expect(resultNoVerify.logs?.length).toStrictEqual(6);
  expect(resultNoVerify.chargedFeesLamports).toStrictEqual(
    lamportsFeePerSigner * 2n,
  );
  const recentBlockHash = await rpcHttpGetLatestBlockHash(rpcHttp);
  const resultWithVerify = await rpcHttpSimulateInstructions(
    rpcHttp,
    [instruction],
    {
      payerSigner,
      extraSigners: [userSigner],
      recentBlockHash,
    },
  );
  expect(resultWithVerify.message.payerAddress).toStrictEqual(
    payerSigner.address,
  );
  expect(resultWithVerify.message.recentBlockHash).toStrictEqual(
    recentBlockHash,
  );
  expect(resultWithVerify.error).toStrictEqual(null);
  expect(resultWithVerify.logs?.length).toStrictEqual(6);
  expect(resultWithVerify.chargedFeesLamports).toStrictEqual(
    lamportsFeePerSigner * 2n,
  );
});

const secret = new Uint8Array([
  96, 11, 209, 132, 49, 92, 144, 135, 105, 211, 34, 171, 125, 156, 217, 148, 65,
  233, 239, 86, 149, 37, 180, 226, 120, 139, 152, 126, 199, 116, 104, 184, 10,
  85, 215, 5, 230, 110, 192, 255, 29, 27, 96, 27, 203, 56, 119, 189, 226, 99,
  13, 150, 68, 70, 138, 190, 182, 126, 125, 69, 25, 66, 190, 239,
]);
