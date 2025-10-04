import { expect, it } from "@jest/globals";
import { rpcHttpFromUrl, rpcHttpWaitForTransaction } from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.mainnet-beta.solana.com");
  // Complex transaction with many inner instructions nested
  const transaction = await rpcHttpWaitForTransaction(
    rpcHttp,
    "5c4TRGCXbv6ChbTpTnmFzt3WFqpWMMSAKdEqiqCFzG7hTFTWxdHpv2VxfQBzG3VwvQ2mMyG4rvV2eTN68jrLKy3U",
    0,
  );
  expect(transaction.message.payerAddress).toStrictEqual(
    "Ewfot2ZKhuGuEWaSRyFpe3LpK9xSEEUrDZk4AQpTazAR",
  );
  expect(transaction.message.recentBlockhash).toStrictEqual(
    "ETzLkjyxUNupAQxQRnTuG2u7wnQCWEgtdTLegeQycCPv",
  );
  expect(transaction.error).toStrictEqual(null);
  expect(transaction.invocations.length).toStrictEqual(4);
  expect(transaction.invocations[0]!.invocations.length).toStrictEqual(0);
  expect(transaction.invocations[1]!.invocations.length).toStrictEqual(0);
  expect(transaction.invocations[2]!.invocations.length).toStrictEqual(0);
  expect(transaction.invocations[3]!.invocations.length).toStrictEqual(1);
  const firstCpi = transaction.invocations[3]!.invocations[0]!;
  expect(firstCpi.invocations.length).toStrictEqual(2);
  expect(firstCpi.invocations[0]!.invocations.length).toStrictEqual(0);
  expect(firstCpi.invocations[1]!.invocations.length).toStrictEqual(4);
  const secondCpi = firstCpi.invocations[1]!;
  expect(secondCpi.invocations[0]!.invocations.length).toStrictEqual(0);
  expect(secondCpi.invocations[1]!.invocations.length).toStrictEqual(0);
  expect(secondCpi.invocations[2]!.invocations.length).toStrictEqual(0);
  expect(secondCpi.invocations[3]!.invocations.length).toStrictEqual(0);
});
