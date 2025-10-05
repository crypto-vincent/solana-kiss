import { expect, it } from "@jest/globals";
import { signatureFromString } from "solana-kiss-data";
import { rpcHttpFromUrl, rpcHttpWaitForTransaction } from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");
  // This should be a simple success
  const transaction1 = await rpcHttpWaitForTransaction(
    rpcHttp,
    signatureFromString(
      "2pqW2HvC2FqVr1GkSgLrPCp55THBzYWP6oMkaB6bZzaRXKYNJ2wfcBCu3M9r64SVcX3fEC5EomwxF939kn4pYXBW",
    ),
    0,
  );
  expect(transaction1.message.payerAddress).toStrictEqual(
    "Eyh77zP5b7arPtPgpnCT8vsGmq9p5Z9HHnBSeQLnAFQi",
  );
  expect(transaction1.message.recentBlockhash).toStrictEqual(
    "EZY4BjNgBeSKEnCV2DycDchJg1kjqiwJ3cb9GFc5Avhy",
  );
  expect(transaction1.error).toStrictEqual(null);
  expect(transaction1.invocations.length).toStrictEqual(1);
  // This should be a failure with error
  const transaction2 = await rpcHttpWaitForTransaction(
    rpcHttp,
    signatureFromString(
      "3VBrBZQERLxdNjqLTzwx7TMQYbUr8ti4547CUK53WByooyJHJGmnkccw2pCQVv7D7Xi65S1E7mSFZETw6ECjxdmd",
    ),
    0,
  );
  expect(transaction2.message.payerAddress).toStrictEqual(
    "Eyh77zP5b7arPtPgpnCT8vsGmq9p5Z9HHnBSeQLnAFQi",
  );
  expect(transaction2.message.recentBlockhash).toStrictEqual(
    "EEkjZAAnF3qd5VRRt62GXjcoBqQYm2ezt9vNVZgZi6xQ",
  );
  expect(transaction2.error).toStrictEqual({
    InstructionError: [1, { Custom: 3012 }],
  });
  expect(transaction2.invocations.length).toStrictEqual(2);
  // This should be a transaction with many instructions (> 50)
  const transaction3 = await rpcHttpWaitForTransaction(
    rpcHttp,
    signatureFromString(
      "2MZyi9uezffec3YyAHpkC33r8Nmgwf3cBHKH1Y9H4EHfoKtZ8sQEKVCHF2Rwb17qQCrUDXS1u1wpNnxgz79U6yWY",
    ),
    0,
  );
  expect(transaction3.message.payerAddress).toStrictEqual(
    "8sQEYJA7f5k3LrTDDkRDj46tWayc1fAdhurh61BtfUxF",
  );
  expect(transaction3.message.recentBlockhash).toStrictEqual(
    "6gtmFZxPgbkS5b2Wxw9bk5XUGZXqwjRTwn2rLVYJiRJS",
  );
  expect(transaction3.error).toStrictEqual(null);
  expect(transaction3.invocations.length).toStrictEqual(50);
});
