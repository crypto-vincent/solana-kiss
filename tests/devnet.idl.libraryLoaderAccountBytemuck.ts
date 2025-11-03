import {
  expectDefined,
  idlAccountDecode,
  IdlLibrary,
  idlLibraryLoaderOnchain,
  idlProgramGuessAccount,
  jsonGetAt,
  pubkeyFromBase58,
  rpcHttpFromUrl,
  rpcHttpGetAccountWithData,
  urlPublicRpcDevnet,
} from "../src";

it("run", async () => {
  // Create the endpoint
  const rpcHttp = rpcHttpFromUrl(urlPublicRpcDevnet);
  // Create the IDL library with onchain loader
  const libraryIdl = new IdlLibrary([
    idlLibraryLoaderOnchain(async (programAddress) => {
      const { accountInfo } = await rpcHttpGetAccountWithData(
        rpcHttp,
        programAddress,
      );
      return accountInfo.data;
    }),
  ]);
  // Actually fetch our account
  const accountAddress = pubkeyFromBase58(
    "FdoXZqdMysWbzB8j5bK6U5J1Dczsos1vGwQi5Tur2mwk",
  );
  const { accountInfo } = await rpcHttpGetAccountWithData(
    rpcHttp,
    accountAddress,
  );
  // Resolve the account's program IDL from onchain
  const programIdl = expectDefined(
    await libraryIdl.getOrLoadProgramIdl(accountInfo.owner),
  );
  // Guess the account IDL from the program IDL
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
