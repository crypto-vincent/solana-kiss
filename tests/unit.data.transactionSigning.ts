import {
  blockHashDefault,
  pubkeyNewDummy,
  signerGenerate,
  transactionCompileAndSign,
  transactionCompileUnsigned,
  transactionSign,
  transactionVerify,
} from "../src";

it("run", async () => {
  const payerSigner = await signerGenerate();
  const dummySigner1 = await signerGenerate();
  const dummySigner2 = await signerGenerate();
  const dummySigner3 = await signerGenerate();

  const transactionRequest = {
    payerAddress: payerSigner.address,
    recentBlockHash: blockHashDefault,
    instructions: [
      {
        programAddress: pubkeyNewDummy(),
        inputs: [
          { address: dummySigner1.address, signer: true, writable: false },
          { address: dummySigner2.address, signer: true, writable: false },
        ],
        data: new Uint8Array([42, 43, 44]),
      },
    ],
  };
  let transactionPacket1 = transactionCompileUnsigned(transactionRequest);
  transactionPacket1 = await transactionSign(transactionPacket1, [
    dummySigner1,
  ]);
  transactionPacket1 = await transactionSign(transactionPacket1, [
    payerSigner,
    dummySigner2,
  ]);
  let transactionPacket2 = await transactionCompileAndSign(
    [dummySigner1, payerSigner],
    transactionRequest,
  );
  transactionPacket2 = await transactionSign(transactionPacket2, [
    dummySigner2,
    dummySigner3,
  ]);
  const transactionPacket3 = await transactionCompileAndSign(
    [dummySigner1, payerSigner, dummySigner2, dummySigner3],
    transactionRequest,
  );
  expect(transactionPacket1).toStrictEqual(transactionPacket2);
  expect(transactionPacket1).toStrictEqual(transactionPacket3);
  await transactionVerify(transactionPacket1);
});
