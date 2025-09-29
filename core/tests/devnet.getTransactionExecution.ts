import { it } from "@jest/globals";
import {
  rpcHttpFromUrl,
  rpcHttpGetAccount,
  rpcHttpGetAccountLamports,
  rpcHttpGetAccountMetadata,
  rpcHttpGetTransaction,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");

  // TODO - proper tests

  /*
  const result1 = await getTransactionExecution(
    rpc,
    "2pqW2HvC2FqVr1GkSgLrPCp55THBzYWP6oMkaB6bZzaRXKYNJ2wfcBCu3M9r64SVcX3fEC5EomwxF939kn4pYXBW",
  );
  console.log("result1", result1);

  const result2 = await getTransactionExecution(
    rpc,
    "3VBrBZQERLxdNjqLTzwx7TMQYbUr8ti4547CUK53WByooyJHJGmnkccw2pCQVv7D7Xi65S1E7mSFZETw6ECjxdmd",
  );
  console.log("result2", result2);

  const result3 = await getTransactionExecution(
    rpc,
    "2MZyi9uezffec3YyAHpkC33r8Nmgwf3cBHKH1Y9H4EHfoKtZ8sQEKVCHF2Rwb17qQCrUDXS1u1wpNnxgz79U6yWY",
  );
  console.log("result3", result3);

  const result4 = await getTransactionExecution(
    rpc,
    "3MZyi9uezffec3YyAHpkC33r8Nmgwf3cBHKH1Y9H4EHfoKtZ8sQEKVCHF2Rwb17qQCrUDXS1u1wpNnxgz79U6yWY",
  );
  console.log("result4", result4);
  */

  const dudu1 = await rpcHttpGetAccount(
    rpcHttp,
    "8fiDhdDH1Mp9V2teYAHdAnbpY9W5wDo8cpCV85eocynN",
  );
  console.log("dudu1", dudu1);

  const dudu2 = await rpcHttpGetAccountLamports(
    rpcHttp,
    "8fiDhdDH1Mp9V2teYAHdAnbpY9W5wDo8cpCV85eocynN",
  );
  console.log("dudu2", dudu2);

  const dudu3 = await rpcHttpGetAccountMetadata(
    rpcHttp,
    "8fiDhdDH1Mp9V2teYAHdAnbpY9W5wDo8cpCV85eocynN",
  );
  console.log("dudu3", dudu3);

  const result5 = await rpcHttpGetTransaction(
    rpcHttp,
    "4MZyi9uezffec3YyAHpkC33r8Nmgwf3cBHKH1Y9H4EHfoKtZ8sQEKVCHF2Rwb17qQCrUDXS1u1wpNnxgz79U6yWY",
  );
  console.log("result5", result5);
});
