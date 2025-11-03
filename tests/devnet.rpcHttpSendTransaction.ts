import { expect, it } from "@jest/globals";
import {
  idlInstructionEncode,
  idlInstructionParse,
  lamportsFeePerSigner,
  lamportsRentExemptionMinimumForSpace,
  Pubkey,
  pubkeyDefault,
  pubkeyNewDummy,
  pubkeyToBase58,
  rpcHttpFromUrl,
  rpcHttpGetAccountMetadata,
  rpcHttpGetLatestBlockHash,
  rpcHttpSendTransaction,
  rpcHttpWaitForTransaction,
  Signer,
  signerFromSecret,
  signerGenerate,
  transactionCompileAndSign,
  TransactionPacket,
  transactionSign,
  urlPublicRpcDevnet,
  WalletAccount,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl(urlPublicRpcDevnet, {
    commitment: "confirmed",
  });
  const programAddress = pubkeyDefault;
  const ownerAddress = pubkeyNewDummy();
  const requestedSpace = 42;
  const transferLamports = lamportsRentExemptionMinimumForSpace(requestedSpace);
  const payerSigner = await signerFromSecret(secret);
  const owned1Signer = await signerGenerate();
  const owned2Signer = await signerGenerate();
  const { blockInfo: recentBlockInfo } =
    await rpcHttpGetLatestBlockHash(rpcHttp);
  const originalRequest = {
    payerAddress: payerSigner.address,
    recentBlockHash: recentBlockInfo.hash,
    instructions: [
      makeCreateInstruction(
        programAddress,
        ownerAddress,
        transferLamports,
        requestedSpace,
        payerSigner,
        owned1Signer,
      ),
      makeCreateInstruction(
        programAddress,
        ownerAddress,
        transferLamports + 42n,
        requestedSpace - 1,
        payerSigner,
        owned2Signer,
      ),
    ],
  };
  const transactionPacket = await transactionCompileAndSign(
    [payerSigner, owned2Signer],
    originalRequest,
  );
  const owned1FakePhantomWalletWithAutoSend: WalletAccount = {
    address: owned1Signer.address,
    signMessage: async (message: Uint8Array) => {
      return await owned1Signer.sign(message);
    },
    signTransaction: async (transactionPacket: TransactionPacket) => {
      const signed = await transactionSign(transactionPacket, [owned1Signer]);
      await rpcHttpSendTransaction(rpcHttp, signed);
      return signed;
    },
  };
  const { transactionHandle } = await rpcHttpSendTransaction(
    rpcHttp,
    await transactionSign(transactionPacket, [
      owned1FakePhantomWalletWithAutoSend,
    ]),
    { skipPreflight: false, skipAlreadySentCheck: false },
  );
  const { transactionRequest, transactionExecution } =
    await rpcHttpWaitForTransaction(rpcHttp, transactionHandle, async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return true;
    });
  expect(transactionRequest).toStrictEqual(originalRequest);
  expect(transactionExecution.chargedFeesLamports).toStrictEqual(
    lamportsFeePerSigner * 3n,
  );
  expect(transactionExecution.logs?.length).toStrictEqual(4);
  expect(transactionExecution.error).toStrictEqual(null);
  const { accountInfo: owned1Info } = await rpcHttpGetAccountMetadata(
    rpcHttp,
    owned1Signer.address,
  );
  expect(owned1Info.executable).toStrictEqual(false);
  expect(owned1Info.lamports).toStrictEqual(transferLamports);
  expect(owned1Info.owner).toStrictEqual(ownerAddress);
  expect(owned1Info.space).toStrictEqual(requestedSpace);
  const { accountInfo: owned2Info } = await rpcHttpGetAccountMetadata(
    rpcHttp,
    owned2Signer.address,
  );
  expect(owned2Info.executable).toStrictEqual(false);
  expect(owned2Info.lamports).toStrictEqual(transferLamports + 42n);
  expect(owned2Info.owner).toStrictEqual(ownerAddress);
  expect(owned2Info.space).toStrictEqual(requestedSpace - 1);
});

function makeCreateInstruction(
  programAddress: Pubkey,
  ownerAddress: Pubkey,
  transferLamports: bigint,
  requestedSpace: number,
  payerSigner: Signer,
  ownedSigner: Signer,
) {
  return idlInstructionEncode(
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
}

const instructionIdl = idlInstructionParse("create", {
  discriminator: { encode: { value: 0, type: "u32" } },
  accounts: [
    { name: "payer", signer: true, writable: true },
    { name: "owned", signer: true, writable: true },
  ],
  args: [
    { name: "lamports", type: "u64" },
    { name: "space", type: "u64" },
    { name: "owner", type: "pubkey" },
  ],
});

const secret = new Uint8Array([
  96, 11, 209, 132, 49, 92, 144, 135, 105, 211, 34, 171, 125, 156, 217, 148, 65,
  233, 239, 86, 149, 37, 180, 226, 120, 139, 152, 126, 199, 116, 104, 184, 10,
  85, 215, 5, 230, 110, 192, 255, 29, 27, 96, 27, 203, 56, 119, 189, 226, 99,
  13, 150, 68, 70, 138, 190, 182, 126, 125, 69, 25, 66, 190, 239,
]);
