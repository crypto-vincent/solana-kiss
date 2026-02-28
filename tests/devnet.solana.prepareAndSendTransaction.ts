import { expect, it } from "@jest/globals";
import {
  lamportsFeePerSignature,
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
  const instructionsRequests = [
    await makeSystemCreateInstructionRequest(
      solana,
      ownerAddress,
      transferLamports,
      requestedSpace,
      payerSigner,
      owned1Signer,
    ),
    await makeSystemCreateInstructionRequest(
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
    signMessage: owned1Signer.sign,
    signTransaction: async (transactionPacket: TransactionPacket) => {
      const signed = await transactionSign(transactionPacket, [owned1Signer]);
      await rpcHttpSendTransaction(solana.getRpcHttp(), signed);
      await timeoutMs(1000);
      return signed;
    },
  };
  const { transactionHandle } = await solana.prepareAndSendTransaction(
    payerSigner,
    instructionsRequests,
    {
      extraSigners: [owned1FakePhantomWalletWithAutoSend, owned2Signer],
      skipPreflight: true,
    },
  );
  const { executionReport } = await rpcHttpWaitForTransaction(
    solana.getRpcHttp(),
    transactionHandle,
    async (context) => {
      if (context.totalDurationMs > 5000) {
        throw new Error("Transaction confirmation timed out");
      }
      await timeoutMs(1000);
      return true;
    },
  );
  expect(executionReport.chargedFeesLamports).toStrictEqual(
    lamportsFeePerSignature * 3n,
  );
  expect(executionReport.transactionLogs?.length).toStrictEqual(4);
  expect(executionReport.transactionError).toStrictEqual(null);
  const owned1 = await solana.getAndInferAndDecodeAccount(owned1Signer.address);
  expect(owned1.programAddress).toStrictEqual(ownerAddress);
  expect(owned1.accountLamports).toStrictEqual(transferLamports);
  expect(owned1.accountData.length).toStrictEqual(requestedSpace);
  expect(owned1.accountState).toStrictEqual(null);
  const owned2 = await solana.getAndInferAndDecodeAccount(owned2Signer.address);
  expect(owned2.programAddress).toStrictEqual(ownerAddress);
  expect(owned2.accountLamports).toStrictEqual(transferLamports + 42n);
  expect(owned2.accountData.length).toStrictEqual(requestedSpace - 1);
  expect(owned2.accountState).toStrictEqual(null);
});

async function makeSystemCreateInstructionRequest(
  solana: Solana,
  ownerAddress: Pubkey,
  transferLamports: bigint,
  requestedSpace: number,
  payerSigner: Signer,
  ownedSigner: Signer,
) {
  const { instructionRequest } = await solana.hydrateAndEncodeInstruction(
    pubkeyDefault,
    "create",
    {
      instructionAddresses: {
        payer: payerSigner.address,
        created: ownedSigner.address,
      },
      instructionPayload: {
        lamports: String(transferLamports),
        space: requestedSpace,
        owner: pubkeyToBase58(ownerAddress),
      },
    },
  );
  return instructionRequest;
}

const secret = new Uint8Array([
  96, 11, 209, 132, 49, 92, 144, 135, 105, 211, 34, 171, 125, 156, 217, 148, 65,
  233, 239, 86, 149, 37, 180, 226, 120, 139, 152, 126, 199, 116, 104, 184, 10,
  85, 215, 5, 230, 110, 192, 255, 29, 27, 96, 27, 203, 56, 119, 189, 226, 99,
  13, 150, 68, 70, 138, 190, 182, 126, 125, 69, 25, 66, 190, 239,
]);
