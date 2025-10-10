import { expect, it } from "@jest/globals";
import {
  rpcHttpFromUrl,
  rpcHttpWaitForTransaction,
  signatureFromBase58,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");
  // This should be a simple success
  const {
    transactionExecution: transactionExecution1,
    // transactionInvocations: transactionInvocations1,
  } = await rpcHttpWaitForTransaction(
    rpcHttp,
    signatureFromBase58(
      "2pqW2HvC2FqVr1GkSgLrPCp55THBzYWP6oMkaB6bZzaRXKYNJ2wfcBCu3M9r64SVcX3fEC5EomwxF939kn4pYXBW",
    ),
    0,
  );
  expect(transactionExecution1.message.payerAddress).toStrictEqual(
    "Eyh77zP5b7arPtPgpnCT8vsGmq9p5Z9HHnBSeQLnAFQi",
  );
  expect(transactionExecution1.message.recentBlockHash).toStrictEqual(
    "EZY4BjNgBeSKEnCV2DycDchJg1kjqiwJ3cb9GFc5Avhy",
  );
  expect(transactionExecution1.error).toStrictEqual(null);
  // expect(transactionInvocations1?.length).toStrictEqual(1);
  // This should be a failure with error
  const {
    transactionExecution: transactionExecution2,
    // transactionInvocations: transactionInvocations2,
  } = await rpcHttpWaitForTransaction(
    rpcHttp,
    signatureFromBase58(
      "3VBrBZQERLxdNjqLTzwx7TMQYbUr8ti4547CUK53WByooyJHJGmnkccw2pCQVv7D7Xi65S1E7mSFZETw6ECjxdmd",
    ),
    0,
  );
  expect(transactionExecution2.message.payerAddress).toStrictEqual(
    "Eyh77zP5b7arPtPgpnCT8vsGmq9p5Z9HHnBSeQLnAFQi",
  );
  expect(transactionExecution2.message.recentBlockHash).toStrictEqual(
    "EEkjZAAnF3qd5VRRt62GXjcoBqQYm2ezt9vNVZgZi6xQ",
  );
  expect(transactionExecution2.error).toEqual({
    InstructionError: [1, { Custom: 3012 }],
  });
  // expect(transactionInvocations2?.length).toStrictEqual(2);
  // This should be a transaction with many instructions (> 50)
  const {
    transactionExecution: transactionExecution3,
    // transactionInvocations: transactionInvocations3,
  } = await rpcHttpWaitForTransaction(
    rpcHttp,
    signatureFromBase58(
      "2MZyi9uezffec3YyAHpkC33r8Nmgwf3cBHKH1Y9H4EHfoKtZ8sQEKVCHF2Rwb17qQCrUDXS1u1wpNnxgz79U6yWY",
    ),
    0,
  );
  expect(transactionExecution3.message.payerAddress).toStrictEqual(
    "8sQEYJA7f5k3LrTDDkRDj46tWayc1fAdhurh61BtfUxF",
  );
  expect(transactionExecution3.message.recentBlockHash).toStrictEqual(
    "6gtmFZxPgbkS5b2Wxw9bk5XUGZXqwjRTwn2rLVYJiRJS",
  );
  expect(transactionExecution3.error).toStrictEqual(null);
  // expect(transactionInvocations3?.length).toStrictEqual(50);
});
