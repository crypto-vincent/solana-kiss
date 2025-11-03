import { expect, it } from "@jest/globals";
import {
  expectDefined,
  pubkeyFromBase58,
  rpcHttpFindAccountTransactions,
  rpcHttpFromUrl,
  rpcHttpGetTransaction,
  urlPublicRpcDevnet,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl(urlPublicRpcDevnet);
  const { rewindingTransactionsHandles } = await rpcHttpFindAccountTransactions(
    rpcHttp,
    pubkeyFromBase58("vVeH6Xd43HAScbxjVtvfwDGqBMaMvNDLsAxwM5WK1pG"),
    4200,
  );
  expect(rewindingTransactionsHandles.length).toBeGreaterThan(0);
  const { transactionExecution } = expectDefined(
    await rpcHttpGetTransaction(
      rpcHttp,
      expectDefined(rewindingTransactionsHandles[0]),
    ),
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
