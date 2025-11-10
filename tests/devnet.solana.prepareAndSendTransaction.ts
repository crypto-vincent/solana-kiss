import { expect, it } from "@jest/globals";
import {
  lamportsFeePerSigner,
  lamportsRentExemptionMinimumForSpace,
  Pubkey,
  pubkeyDefault,
  pubkeyNewDummy,
  pubkeyToBase58,
  rpcHttpSendTransaction,
  rpcHttpWaitForTransaction,
  Signer,
  signerFromSecret,
  signerGenerate,
  Solana,
  timeoutMs,
  TransactionPacket,
  transactionSign,
  WalletAccount,
} from "../src";

it("run", async () => {
  const solana = new Solana("devnet");
  const ownerAddress = pubkeyNewDummy();
  const requestedSpace = 42;
  const transferLamports = lamportsRentExemptionMinimumForSpace(requestedSpace);
  const payerSigner = await signerFromSecret(secret);
  const owned1Signer = await signerGenerate();
  const owned2Signer = await signerGenerate();
  const instructions = [
    await makeSystemCreateInstruction(
      solana,
      ownerAddress,
      transferLamports,
      requestedSpace,
      payerSigner,
      owned1Signer,
    ),
    await makeSystemCreateInstruction(
      solana,
      ownerAddress,
      transferLamports + 42n,
      requestedSpace - 1,
      payerSigner,
      owned2Signer,
    ),
  ];
  const owned1FakePhantomWalletWithAutoSend: WalletAccount = {
    address: owned1Signer.address,
    signMessage: async (message: Uint8Array) => {
      return await owned1Signer.sign(message);
    },
    signTransaction: async (transactionPacket: TransactionPacket) => {
      const signed = await transactionSign(transactionPacket, [owned1Signer]);
      await rpcHttpSendTransaction(solana.getRpcHttp(), signed);
      await timeoutMs(1000);
      return signed;
    },
  };
  const { transactionHandle } = await solana.prepareAndSendTransaction(
    payerSigner,
    instructions,
    { extraSigners: [owned1FakePhantomWalletWithAutoSend, owned2Signer] },
  );
  const { transactionExecution } = await rpcHttpWaitForTransaction(
    solana.getRpcHttp(),
    transactionHandle,
    async (context) => {
      if (context.totalDurationMs > 10000) {
        throw new Error("Transaction confirmation timed out");
      }
      await timeoutMs(2000);
      return true;
    },
  );
  expect(transactionExecution.chargedFeesLamports).toStrictEqual(
    lamportsFeePerSigner * 3n,
  );
  expect(transactionExecution.logs?.length).toStrictEqual(4);
  expect(transactionExecution.error).toStrictEqual(null);
  const { accountInfo: owned1Info } =
    await solana.getAndInferAndDecodeAccountInfo(owned1Signer.address);
  expect(owned1Info.executable).toStrictEqual(false);
  expect(owned1Info.lamports).toStrictEqual(transferLamports);
  expect(owned1Info.owner).toStrictEqual(ownerAddress);
  expect(owned1Info.data.length).toStrictEqual(requestedSpace);
  expect(owned1Info.state).toStrictEqual(null);
  const { accountInfo: owned2Info } =
    await solana.getAndInferAndDecodeAccountInfo(owned2Signer.address);
  expect(owned2Info.executable).toStrictEqual(false);
  expect(owned2Info.lamports).toStrictEqual(transferLamports + 42n);
  expect(owned2Info.owner).toStrictEqual(ownerAddress);
  expect(owned2Info.data.length).toStrictEqual(requestedSpace - 1);
  expect(owned1Info.state).toStrictEqual(null);
});

async function makeSystemCreateInstruction(
  solana: Solana,
  ownerAddress: Pubkey,
  transferLamports: bigint,
  requestedSpace: number,
  payerSigner: Signer,
  ownedSigner: Signer,
) {
  return solana.hydrateAndEncodeInstruction(pubkeyDefault, "create", {
    instructionAddresses: {
      payer: payerSigner.address,
      created: ownedSigner.address,
    },
    instructionPayload: {
      lamports: String(transferLamports),
      space: requestedSpace,
      owner: pubkeyToBase58(ownerAddress),
    },
  });
}

const secret = new Uint8Array([
  96, 11, 209, 132, 49, 92, 144, 135, 105, 211, 34, 171, 125, 156, 217, 148, 65,
  233, 239, 86, 149, 37, 180, 226, 120, 139, 152, 126, 199, 116, 104, 184, 10,
  85, 215, 5, 230, 110, 192, 255, 29, 27, 96, 27, 203, 56, 119, 189, 226, 99,
  13, 150, 68, 70, 138, 190, 182, 126, 125, 69, 25, 66, 190, 239,
]);
