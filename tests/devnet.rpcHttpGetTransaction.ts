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
    transactionExecution: transactionExecution1,
    transactionFlow: transactionFlow1,
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
  expect(transactionExecution1.transactionError).toStrictEqual(null);
  expect(transactionFlow1?.length).toStrictEqual(1);
  // This should be a failure with error
  const {
    transactionRequest: transactionRequest2,
    transactionExecution: transactionExecution2,
    transactionFlow: transactionFlow2,
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
  expect(transactionExecution2.transactionError).toEqual({
    InstructionError: [1, { Custom: 3012 }],
  });
  expect(transactionFlow2?.length).toStrictEqual(2);
  expect(
    (transactionFlow2 as any)[1].invocation.instructionError,
  ).toStrictEqual("custom program error: 0xbc4");
  // This should be a transaction with many instructions (> 50)
  const {
    transactionRequest: transactionRequest3,
    transactionExecution: transactionExecution3,
    transactionFlow: transactionFlow3,
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
  expect(transactionExecution3.transactionError).toStrictEqual(null);
  expect(transactionFlow3?.length).toStrictEqual(50);
});
