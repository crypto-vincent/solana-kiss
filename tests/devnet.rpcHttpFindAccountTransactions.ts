import { expect, it } from "@jest/globals";
import {
  expectDefined,
  pubkeyFromBase58,
  rpcHttpFindAccountTransactions,
  rpcHttpFromUrl,
  rpcHttpGetTransaction,
  urlRpcPublicDevnet,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl(urlRpcPublicDevnet);
  const { newToOldTransactionsHandles } = await rpcHttpFindAccountTransactions(
    rpcHttp,
    pubkeyFromBase58("vVeH6Xd43HAScbxjVtvfwDGqBMaMvNDLsAxwM5WK1pG"),
    4200,
  );
  expect(newToOldTransactionsHandles.length).toBeGreaterThan(100);
  expect(newToOldTransactionsHandles.length).toBeLessThanOrEqual(4200);
  const { transactionExecution } = expectDefined(
    await rpcHttpGetTransaction(
      rpcHttp,
      expectDefined(newToOldTransactionsHandles[0]),
    ),
  );
  expect(transactionExecution.blockTime?.toISOString()).toStrictEqual(
    "2025-08-21T15:26:48.000Z",
  );
  let found = 0;
  for (const log of transactionExecution.transactionLogs ?? []) {
    if (log.includes("vVeH6Xd43HAScbxjVtvfwDGqBMaMvNDLsAxwM5WK1pG")) {
      found += 1;
    }
  }
  expect(found).toBeGreaterThan(0);
});
