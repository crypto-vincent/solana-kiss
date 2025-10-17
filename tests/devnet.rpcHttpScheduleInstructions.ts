import { expect, it } from "@jest/globals";
import {
  idlInstructionEncode,
  idlInstructionParse,
  lamportsFeePerSigner,
  lamportsRentExemptionMinimumForSpace,
  pubkeyDefault,
  pubkeyNewDummy,
  pubkeyToBase58,
  rpcHttpFromUrl,
  rpcHttpGetAccountMetadata,
  rpcHttpGetLatestBlockHash,
  rpcHttpScheduleInstructions,
  rpcHttpWaitForTransaction,
  signerFromSecret,
  signerGenerate,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com", {
    commitment: "confirmed",
  });
  const programAddress = pubkeyDefault;
  const payerSigner = await signerFromSecret(secret);
  const ownedSigner = await signerGenerate();
  const ownerAddress = pubkeyNewDummy();
  const { blockInfo: recentBlockInfo } =
    await rpcHttpGetLatestBlockHash(rpcHttp);
  const requestedSpace = 42;
  const transferLamports = lamportsRentExemptionMinimumForSpace(requestedSpace);
  const instruction = idlInstructionEncode(
    instructionIdl,
    programAddress,
    {
      payer: payerSigner.address,
      owned: ownedSigner.address,
    },
    {
      lamports: String(transferLamports),
      space: requestedSpace,
      owner: pubkeyToBase58(ownerAddress),
    },
  );
  const { transactionId } = await rpcHttpScheduleInstructions(
    rpcHttp,
    [instruction],
    {
      payerSigner,
      extraSigners: [ownedSigner],
      recentBlockHash: recentBlockInfo.hash,
    },
  );
  const { transactionExecution } = await rpcHttpWaitForTransaction(
    rpcHttp,
    transactionId,
    async () => true,
  );
  expect(transactionExecution.chargedFeesLamports).toStrictEqual(
    lamportsFeePerSigner * 2n,
  );
  expect(transactionExecution.logs?.length).toStrictEqual(2);
  expect(transactionExecution.error).toStrictEqual(null);
  const { accountInfo: ownedAccountInfo } = await rpcHttpGetAccountMetadata(
    rpcHttp,
    ownedSigner.address,
  );
  expect(ownedAccountInfo.executable).toStrictEqual(false);
  expect(ownedAccountInfo.lamports).toStrictEqual(transferLamports);
  expect(ownedAccountInfo.owner).toStrictEqual(ownerAddress);
  expect(ownedAccountInfo.space).toStrictEqual(requestedSpace);
});

const secret = new Uint8Array([
  96, 11, 209, 132, 49, 92, 144, 135, 105, 211, 34, 171, 125, 156, 217, 148, 65,
  233, 239, 86, 149, 37, 180, 226, 120, 139, 152, 126, 199, 116, 104, 184, 10,
  85, 215, 5, 230, 110, 192, 255, 29, 27, 96, 27, 203, 56, 119, 189, 226, 99,
  13, 150, 68, 70, 138, 190, 182, 126, 125, 69, 25, 66, 190, 239,
]);

const instructionIdl = idlInstructionParse("create", {
  discriminator: { encode: { value: 0, type: "u32" } },
  accounts: [
    { name: "payer", signing: true, writable: true },
    { name: "owned", signing: true, writable: true },
  ],
  args: [
    { name: "lamports", type: "u64" },
    { name: "space", type: "u64" },
    { name: "owner", type: "pubkey" },
  ],
});
