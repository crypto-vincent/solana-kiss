import { expect, it } from "@jest/globals";
import {
  rpcHttpFromUrl,
  rpcHttpWaitForTransaction,
  signatureFromBase58,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.mainnet-beta.solana.com");
  // Complex transaction with many inner instructions nested
  const { transactionExecution, transactionInvocations } =
    await rpcHttpWaitForTransaction(
      rpcHttp,
      signatureFromBase58(
        "5c4TRGCXbv6ChbTpTnmFzt3WFqpWMMSAKdEqiqCFzG7hTFTWxdHpv2VxfQBzG3VwvQ2mMyG4rvV2eTN68jrLKy3U",
      ),
      0,
    );
  expect(transactionExecution.message.payerAddress).toStrictEqual(
    "Ewfot2ZKhuGuEWaSRyFpe3LpK9xSEEUrDZk4AQpTazAR",
  );
  expect(transactionExecution.message.recentBlockHash).toStrictEqual(
    "ETzLkjyxUNupAQxQRnTuG2u7wnQCWEgtdTLegeQycCPv",
  );
  expect(transactionExecution.error).toStrictEqual(null);
  // Check the invocations tree shape
  const invocations = transactionInvocations!;
  expect(invocations.length).toStrictEqual(4);
  expect(invocations[0]!.invocations.length).toStrictEqual(0);
  expect(invocations[1]!.invocations.length).toStrictEqual(0);
  expect(invocations[2]!.invocations.length).toStrictEqual(0);
  const lastRootCall = invocations[3]!;
  expect(lastRootCall.invocations.length).toStrictEqual(1);
  const firstCpi = lastRootCall.invocations[0]!;
  expect(firstCpi.invocations.length).toStrictEqual(2);
  expect(firstCpi.invocations[0]!.invocations.length).toStrictEqual(0);
  expect(firstCpi.invocations[1]!.invocations.length).toStrictEqual(4);
  const secondCpi = firstCpi.invocations[1]!;
  expect(secondCpi.invocations[0]!.invocations.length).toStrictEqual(0);
  expect(secondCpi.invocations[1]!.invocations.length).toStrictEqual(0);
  expect(secondCpi.invocations[2]!.invocations.length).toStrictEqual(0);
  expect(secondCpi.invocations[3]!.invocations.length).toStrictEqual(0);
});
