import { expect, it } from "@jest/globals";
import {
  idlInstructionAccountsEncode,
  idlInstructionArgsEncode,
  idlInstructionParse,
  InstructionRequest,
  lamportsFeePerSignature,
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
  timeoutMs,
  transactionCompileAndSign,
  TransactionPacket,
  TransactionRequest,
  transactionSign,
  urlRpcPublicDevnet,
  WalletAccount,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl(urlRpcPublicDevnet, {
    commitment: "confirmed",
  });
  const programAddress = pubkeyDefault;
  const ownerAddress = pubkeyNewDummy();
  const requestedSpace = 42;
  const transferLamports = lamportsRentExemptionMinimumForSpace(requestedSpace);
  const payerSigner = await signerFromSecret(secret);
  const owned1Signer = await signerGenerate();
  const owned2Signer = await signerGenerate();
  const { blockHash: recentBlockHash } =
    await rpcHttpGetLatestBlockHash(rpcHttp);
  const originalRequest: TransactionRequest = {
    payerAddress: payerSigner.address,
    recentBlockHash,
    instructionsRequests: [
      makeCreateInstructionRequest(
        programAddress,
        ownerAddress,
        transferLamports,
        requestedSpace,
        payerSigner,
        owned1Signer,
      ),
      makeCreateInstructionRequest(
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
    signMessage: owned1Signer.sign,
    signTransaction: async (transactionPacket: TransactionPacket) => {
      const signed = await transactionSign(transactionPacket, [owned1Signer]);
      await rpcHttpSendTransaction(rpcHttp, signed);
      await timeoutMs(1000);
      return signed;
    },
  };
  const { transactionHandle } = await rpcHttpSendTransaction(
    rpcHttp,
    await transactionSign(transactionPacket, [
      owned1FakePhantomWalletWithAutoSend,
    ]),
    { skipPreflight: true },
  );
  const { transactionRequest, executionReport } =
    await rpcHttpWaitForTransaction(rpcHttp, transactionHandle, async () => {
      await timeoutMs(2000);
      return true;
    });
  expect(transactionRequest).toStrictEqual(originalRequest);
  expect(executionReport.chargedFeesLamports).toStrictEqual(
    lamportsFeePerSignature * 3n,
  );
  expect(executionReport.transactionLogs?.length).toStrictEqual(4);
  expect(executionReport.transactionError).toStrictEqual(null);
  const owned1 = await rpcHttpGetAccountMetadata(rpcHttp, owned1Signer.address);
  expect(owned1.programAddress).toStrictEqual(ownerAddress);
  expect(owned1.accountExecutable).toStrictEqual(false);
  expect(owned1.accountLamports).toStrictEqual(transferLamports);
  expect(owned1.accountSpace).toStrictEqual(requestedSpace);
  const owned2 = await rpcHttpGetAccountMetadata(rpcHttp, owned2Signer.address);
  expect(owned2.programAddress).toStrictEqual(ownerAddress);
  expect(owned2.accountExecutable).toStrictEqual(false);
  expect(owned2.accountLamports).toStrictEqual(transferLamports + 42n);
  expect(owned2.accountSpace).toStrictEqual(requestedSpace - 1);
});

function makeCreateInstructionRequest(
  programAddress: Pubkey,
  ownerAddress: Pubkey,
  transferLamports: bigint,
  requestedSpace: number,
  payerSigner: Signer,
  ownedSigner: Signer,
): InstructionRequest {
  return {
    programAddress,
    instructionInputs: idlInstructionAccountsEncode(instructionIdl, {
      payer: payerSigner.address,
      owned: ownedSigner.address,
    }).instructionInputs,
    instructionData: idlInstructionArgsEncode(instructionIdl, {
      lamports: String(transferLamports),
      space: requestedSpace,
      owner: pubkeyToBase58(ownerAddress),
    }).instructionData,
  };
}

const instructionIdl = idlInstructionParse(
  "create",
  {
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
  },
  new Map(),
);

const secret = new Uint8Array([
  96, 11, 209, 132, 49, 92, 144, 135, 105, 211, 34, 171, 125, 156, 217, 148, 65,
  233, 239, 86, 149, 37, 180, 226, 120, 139, 152, 126, 199, 116, 104, 184, 10,
  85, 215, 5, 230, 110, 192, 255, 29, 27, 96, 27, 203, 56, 119, 189, 226, 99,
  13, 150, 68, 70, 138, 190, 182, 126, 125, 69, 25, 66, 190, 239,
]);
