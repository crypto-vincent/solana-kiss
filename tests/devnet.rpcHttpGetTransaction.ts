import { expect, it } from "@jest/globals";
import {
  expectDefined,
  rpcHttpFromUrl,
  rpcHttpGetTransaction,
  signatureFromBase58,
  urlRpcPublicDevnet,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl(urlRpcPublicDevnet);
  // This should be a simple success
  const {
    transactionRequest: transactionRequest1,
    executionReport: executionReport1,
    executionFlow: executionFlow1,
  } = expectDefined(
    await rpcHttpGetTransaction(
      rpcHttp,
      signatureFromBase58(
        "2pqW2HvC2FqVr1GkSgLrPCp55THBzYWP6oMkaB6bZzaRXKYNJ2wfcBCu3M9r64SVcX3fEC5EomwxF939kn4pYXBW",
      ),
    ),
  );
  expect(transactionRequest1.payerAddress).toStrictEqual(
    "Eyh77zP5b7arPtPgpnCT8vsGmq9p5Z9HHnBSeQLnAFQi",
  );
  expect(transactionRequest1.recentBlockHash).toStrictEqual(
    "EZY4BjNgBeSKEnCV2DycDchJg1kjqiwJ3cb9GFc5Avhy",
  );
  expect(executionReport1.transactionError).toStrictEqual(null);
  expect(executionFlow1?.length).toStrictEqual(1);
  // This should be a failure with error
  const {
    transactionRequest: transactionRequest2,
    executionReport: executionReport2,
    executionFlow: executionFlow2,
  } = expectDefined(
    await rpcHttpGetTransaction(
      rpcHttp,
      signatureFromBase58(
        "3VBrBZQERLxdNjqLTzwx7TMQYbUr8ti4547CUK53WByooyJHJGmnkccw2pCQVv7D7Xi65S1E7mSFZETw6ECjxdmd",
      ),
    ),
  );
  expect(transactionRequest2.payerAddress).toStrictEqual(
    "Eyh77zP5b7arPtPgpnCT8vsGmq9p5Z9HHnBSeQLnAFQi",
  );
  expect(transactionRequest2.recentBlockHash).toStrictEqual(
    "EEkjZAAnF3qd5VRRt62GXjcoBqQYm2ezt9vNVZgZi6xQ",
  );
  expect(executionReport2.transactionError).toEqual({
    InstructionError: [1, { Custom: 3012 }],
  });
  expect(executionFlow2?.length).toStrictEqual(2);
  expect((executionFlow2 as any)[1].invocation.instructionError).toStrictEqual(
    "custom program error: 0xbc4",
  );
  // This should be a transaction with many instructions (> 50)
  const {
    transactionRequest: transactionRequest3,
    executionReport: executionReport3,
    executionFlow: executionFlow3,
  } = expectDefined(
    await rpcHttpGetTransaction(
      rpcHttp,
      signatureFromBase58(
        "2MZyi9uezffec3YyAHpkC33r8Nmgwf3cBHKH1Y9H4EHfoKtZ8sQEKVCHF2Rwb17qQCrUDXS1u1wpNnxgz79U6yWY",
      ),
    ),
  );
  expect(transactionRequest3.payerAddress).toStrictEqual(
    "8sQEYJA7f5k3LrTDDkRDj46tWayc1fAdhurh61BtfUxF",
  );
  expect(transactionRequest3.recentBlockHash).toStrictEqual(
    "6gtmFZxPgbkS5b2Wxw9bk5XUGZXqwjRTwn2rLVYJiRJS",
  );
  expect(executionReport3.transactionError).toStrictEqual(null);
  expect(executionFlow3?.length).toStrictEqual(50);
  // This transaction should have failed but still be parsable
  const {
    transactionRequest: transactionRequest4,
    executionReport: executionReport4,
    executionFlow: executionFlow4,
  } = expectDefined(
    await rpcHttpGetTransaction(
      rpcHttp,
      signatureFromBase58(
        "2ruAW8qcrTPquhCntAjW71EjVjvaCaqXkS31urMjUUQ3TG2eYP6nSGwF4PNbkWFFTyCHtcUojx16Gx1PHXCWA2B4",
      ),
    ),
  );
  expect(transactionRequest4.payerAddress).toStrictEqual(
    "Fosi72YsJYbfvpuhygcEtXjCBEajdNJon6n7Ztzb1VAY",
  );
  expect(transactionRequest4.recentBlockHash).toStrictEqual(
    "DSdtibZUiVuXff5fGVWVmTCAM6NHEhkRo6LENA3kvNYc",
  );
  expect(executionReport4.transactionError?.toString()).toStrictEqual(
    {
      InstructionError: [0, "UnsupportedProgramId"],
    }.toString(),
  );
  expect(executionFlow4?.length).toStrictEqual(1);
});
