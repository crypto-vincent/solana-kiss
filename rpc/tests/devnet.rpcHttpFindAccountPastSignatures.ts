import { it } from "@jest/globals";
import {
  rpcHttpFindAccountPastSignatures,
  rpcHttpFromUrl,
  rpcHttpWaitForTransaction,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");
  const pastSignatures = await rpcHttpFindAccountPastSignatures(
    rpcHttp,
    "vVeH6Xd43HAScbxjVtvfwDGqBMaMvNDLsAxwM5WK1pG",
    4200,
  );
  expect(pastSignatures.length).toBeGreaterThan(0);
  const pastSignature = pastSignatures[0]!;
  const transaction = await rpcHttpWaitForTransaction(
    rpcHttp,
    pastSignature,
    0,
  );
  let found = 0;
  for (const log of transaction.logs) {
    if (log.includes("vVeH6Xd43HAScbxjVtvfwDGqBMaMvNDLsAxwM5WK1pG")) {
      found += 1;
    }
  }
  expect(found).toBeGreaterThan(0);
});
