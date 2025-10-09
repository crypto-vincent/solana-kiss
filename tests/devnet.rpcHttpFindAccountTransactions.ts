import { expect, it } from "@jest/globals";
import {
  pubkeyFromBase58,
  rpcHttpFindAccountTransactions,
  rpcHttpFromUrl,
  rpcHttpWaitForTransaction,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");
  const { backwardTransactionsIds } = await rpcHttpFindAccountTransactions(
    rpcHttp,
    pubkeyFromBase58("vVeH6Xd43HAScbxjVtvfwDGqBMaMvNDLsAxwM5WK1pG"),
    4200,
  );
  expect(backwardTransactionsIds.length).toBeGreaterThan(0);
  const { transactionExecution } = await rpcHttpWaitForTransaction(
    rpcHttp,
    backwardTransactionsIds[0]!,
    0,
  );
  expect(transactionExecution.blockInfo.time?.toISOString()).toStrictEqual(
    "2025-08-21T15:26:48.000Z",
  );
  let found = 0;
  for (const log of transactionExecution.logs ?? []) {
    if (log.includes("vVeH6Xd43HAScbxjVtvfwDGqBMaMvNDLsAxwM5WK1pG")) {
      found += 1;
    }
  }
  expect(found).toBeGreaterThan(0);
});
