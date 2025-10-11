import {
  expectDefined,
  idlAccountDecode,
  idlOnchainAnchorAddress,
  idlOnchainAnchorDecode,
  idlProgramGuessAccount,
  jsonGetAt,
  pubkeyFromBase58,
  rpcHttpFromUrl,
  rpcHttpGetAccountWithData,
} from "../src";

it("run", async () => {
  // Create the endpoint
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");
  // Actually fetch our account
  const accountAddress = pubkeyFromBase58(
    "FdoXZqdMysWbzB8j5bK6U5J1Dczsos1vGwQi5Tur2mwk",
  );
  const { accountInfo } = await rpcHttpGetAccountWithData(
    rpcHttp,
    accountAddress,
  );
  // Resolve the account's program IDL from onchain
  const onchainAnchorAddress = idlOnchainAnchorAddress(accountInfo.owner);
  const { accountInfo: onchainAnchorInfo } = await rpcHttpGetAccountWithData(
    rpcHttp,
    onchainAnchorAddress,
  );
  const programIdl = idlOnchainAnchorDecode(onchainAnchorInfo.data);
  const accountIdl = expectDefined(
    idlProgramGuessAccount(programIdl, accountInfo.data),
  );
  // Decode the account data and check some values
  const accountState = idlAccountDecode(accountIdl, accountInfo.data);
  expect(accountIdl.name).toStrictEqual("CoordinatorAccount");
  expect(jsonGetAt(accountState, "state.metadata.vocab_size")).toStrictEqual(
    "129280",
  );
  expect(
    jsonGetAt(accountState, "state.coordinator.config.min_clients"),
  ).toStrictEqual(24);
});
