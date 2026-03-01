import { rpcHttpWaitForTransaction, signatureFromBase58, Solana } from "../src";

it("run", async () => {
  const solana = new Solana("mainnet");

  const { executionFlow } = await rpcHttpWaitForTransaction(
    solana.getRpcHttp(),
    signatureFromBase58(
      "N5NJqSojV1G69dTPzt3e4ikBtTssLtze8HhWPuJFPjJwSxPBBqkt9n9SMF8KHYXYS3PDkozruJEtKfDNuSZKApi",
    ),
    async () => true,
  );

  const instructionRequest = (executionFlow as any)[3].invocation
    .innerExecutionFlow[1].invocation.instructionRequest;

  const { instructionIdl, instructionAddresses } =
    await solana.inferAndDecodeInstruction(instructionRequest);
  expect(instructionIdl.name).toStrictEqual("pool_extract");
  expect(instructionAddresses["pool"]).toStrictEqual(
    "8sWsVPJpjcBrmmuAQCk1Tp6BgAmEc8A5UM8RhJn1qzED",
  );
});
