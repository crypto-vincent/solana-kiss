import {
  rpcHttpFromUrl,
  rpcHttpWaitForTransaction,
  signatureFromBase58,
  Solana,
  urlRpcPublicMainnet,
} from "../src";

it("run", async () => {
  const solana = new Solana(rpcHttpFromUrl(urlRpcPublicMainnet));

  const { transactionFlow } = await rpcHttpWaitForTransaction(
    solana.getRpcHttp(),
    signatureFromBase58(
      "N5NJqSojV1G69dTPzt3e4ikBtTssLtze8HhWPuJFPjJwSxPBBqkt9n9SMF8KHYXYS3PDkozruJEtKfDNuSZKApi",
    ),
    async () => true,
  );

  const instructionRequest = (transactionFlow as any)[3].invocation.innerFlow[1]
    .invocation.instructionRequest;

  const { instructionIdl, instructionAddresses } =
    await solana.inferAndDecodeInstruction(instructionRequest);
  expect(instructionIdl.name).toStrictEqual("pool_extract");
  expect(instructionAddresses["pool"]).toStrictEqual(
    "8sWsVPJpjcBrmmuAQCk1Tp6BgAmEc8A5UM8RhJn1qzED",
  );
});
