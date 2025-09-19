import { it } from "@jest/globals";
import { getTransactionExecution, rpcHttpFromUrl } from "../src";

it("run", async () => {
  let rpc = rpcHttpFromUrl("https://api.devnet.solana.com");

  let result1 = await getTransactionExecution(
    rpc,
    "2pqW2HvC2FqVr1GkSgLrPCp55THBzYWP6oMkaB6bZzaRXKYNJ2wfcBCu3M9r64SVcX3fEC5EomwxF939kn4pYXBW",
  );
  console.log("result1", result1);

  let result2 = await getTransactionExecution(
    rpc,
    "3VBrBZQERLxdNjqLTzwx7TMQYbUr8ti4547CUK53WByooyJHJGmnkccw2pCQVv7D7Xi65S1E7mSFZETw6ECjxdmd",
  );
  console.log("result2", result2);

  let result3 = await getTransactionExecution(
    rpc,
    "2MZyi9uezffec3YyAHpkC33r8Nmgwf3cBHKH1Y9H4EHfoKtZ8sQEKVCHF2Rwb17qQCrUDXS1u1wpNnxgz79U6yWY",
  );
  console.log("result3", result3);

  let result4 = await getTransactionExecution(
    rpc,
    "3MZyi9uezffec3YyAHpkC33r8Nmgwf3cBHKH1Y9H4EHfoKtZ8sQEKVCHF2Rwb17qQCrUDXS1u1wpNnxgz79U6yWY",
  );
  console.log("result4", result4);
});
