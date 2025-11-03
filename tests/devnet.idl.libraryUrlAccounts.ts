import {
  expectDefined,
  idlAccountDecode,
  IdlLibrary,
  idlLibraryLoaderUrl,
  idlProgramGuessAccount,
  JsonValue,
  Pubkey,
  pubkeyFromBase58,
  RpcHttp,
  rpcHttpFromUrl,
  rpcHttpGetAccountWithData,
  urlPublicRpcDevnet,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl(urlPublicRpcDevnet);
  const libraryIdl = new IdlLibrary([
    idlLibraryLoaderUrl(
      (programAddress) =>
        `https://raw.githubusercontent.com/crypto-vincent/solana-idls/refs/heads/main/data/${programAddress}.json`,
    ),
  ]);
  await assertAccountState(
    rpcHttp,
    libraryIdl,
    pubkeyFromBase58("Ady55LhZxWFABzdg8NCNTAZv5XstBqyNZYCMfWqW3Rq9"),
    "system",
    "Wallet",
    undefined,
  );
  await assertAccountState(
    rpcHttp,
    libraryIdl,
    pubkeyFromBase58("UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j"),
    "bpf_loader_upgradeable",
    "Program",
    { program_data: "9rtcXuviJngSZTRSCXxsHyd6qaWpqWSQ56SNumXAuLJ1" },
  );
  await assertAccountState(
    rpcHttp,
    libraryIdl,
    pubkeyFromBase58("9rtcXuviJngSZTRSCXxsHyd6qaWpqWSQ56SNumXAuLJ1"),
    "bpf_loader_upgradeable",
    "ProgramData",
    {
      slot: "347133692",
      upgrade_authority: "7poxwHXi62Cwa57xdrpfoW2bUF7s8iXm1CU4jJqYPhu",
    },
  );
  await assertAccountState(
    rpcHttp,
    libraryIdl,
    pubkeyFromBase58("EsQycjp856vTPvrxMuH1L6ymd5K63xT7aULGepiTcgM3"),
    "spl_token",
    "TokenMint",
    {
      decimals: 9,
      freeze_authority: null,
      is_initialized: true,
      mint_authority: "7poxwHXi62Cwa57xdrpfoW2bUF7s8iXm1CU4jJqYPhu",
      supply: "1000000000000000",
    },
  );
  await assertAccountState(
    rpcHttp,
    libraryIdl,
    pubkeyFromBase58("8EodedXFv8DAJ6jGTg4DVXaBVJTVL3o4T2BWwTJTTJjw"),
    "spl_name_service",
    "NameRecordHeader",
    {
      class: "11111111111111111111111111111111",
      owner: "8aU2gq8XgzNZr8z4noV87Sx8a3EV29gmi645qQERsaTD",
      parent_name: "11111111111111111111111111111111",
    },
  );
});

async function assertAccountState(
  rpcHttp: RpcHttp,
  libraryIdl: IdlLibrary,
  address: Pubkey,
  expectedProgramName: string,
  expectedAccountName: string,
  expectedState: JsonValue,
) {
  const { accountInfo } = await rpcHttpGetAccountWithData(rpcHttp, address);
  const programIdl = expectDefined(
    await libraryIdl.getOrLoadProgramIdl(accountInfo.owner),
  );
  const accountIdl = expectDefined(
    idlProgramGuessAccount(programIdl, accountInfo.data),
  );
  const accountState = idlAccountDecode(accountIdl, accountInfo.data);
  expect(programIdl.metadata.name).toStrictEqual(expectedProgramName);
  expect(accountIdl.name).toStrictEqual(expectedAccountName);
  expect(accountState).toStrictEqual(expectedState);
}
