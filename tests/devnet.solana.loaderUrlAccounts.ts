import {
  JsonValue,
  Pubkey,
  pubkeyFromBase58,
  rpcHttpFromUrl,
  Solana,
  urlRpcPublicDevnet,
} from "../src";

it("run", async () => {
  const solana = new Solana(rpcHttpFromUrl(urlRpcPublicDevnet));
  await assertAccountState(
    solana,
    pubkeyFromBase58("Ady55LhZxWFABzdg8NCNTAZv5XstBqyNZYCMfWqW3Rq9"),
    "system",
    "Account",
    null,
  );
  await assertAccountState(
    solana,
    pubkeyFromBase58("UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j"),
    "bpf_loader_upgradeable",
    "Program",
    { programData: "9rtcXuviJngSZTRSCXxsHyd6qaWpqWSQ56SNumXAuLJ1" },
  );
  await assertAccountState(
    solana,
    pubkeyFromBase58("9rtcXuviJngSZTRSCXxsHyd6qaWpqWSQ56SNumXAuLJ1"),
    "bpf_loader_upgradeable",
    "ProgramData",
    {
      slot: "347133692",
      upgradeAuthority: "7poxwHXi62Cwa57xdrpfoW2bUF7s8iXm1CU4jJqYPhu",
    },
  );
  await assertAccountState(
    solana,
    pubkeyFromBase58("EsQycjp856vTPvrxMuH1L6ymd5K63xT7aULGepiTcgM3"),
    "spl_token",
    "TokenMint",
    {
      decimals: 9,
      freezeAuthority: null,
      isInitialized: true,
      mintAuthority: "7poxwHXi62Cwa57xdrpfoW2bUF7s8iXm1CU4jJqYPhu",
      supply: "1000000000000000",
    },
  );
  await assertAccountState(
    solana,
    pubkeyFromBase58("8EodedXFv8DAJ6jGTg4DVXaBVJTVL3o4T2BWwTJTTJjw"),
    "spl_name_service",
    "NameRecordHeader",
    {
      class: "11111111111111111111111111111111",
      owner: "8aU2gq8XgzNZr8z4noV87Sx8a3EV29gmi645qQERsaTD",
      parentName: "11111111111111111111111111111111",
    },
  );
});

async function assertAccountState(
  solana: Solana,
  accountAddress: Pubkey,
  expectedProgramName: string,
  expectedAccountName: string,
  expectedState: JsonValue,
) {
  const { programInfo, accountInfo } =
    await solana.getAndInferAndDecodeAccount(accountAddress);
  expect(programInfo.idl.metadata.name).toStrictEqual(expectedProgramName);
  expect(accountInfo.idl.name).toStrictEqual(expectedAccountName);
  expect(accountInfo.state).toStrictEqual(expectedState);
}
