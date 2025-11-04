import {
  JsonValue,
  Pubkey,
  pubkeyFromBase58,
  rpcHttpFromUrl,
  Service,
  urlPublicRpcDevnet,
} from "../src";

it("run", async () => {
  const service = new Service(rpcHttpFromUrl(urlPublicRpcDevnet));
  await assertAccountState(
    service,
    pubkeyFromBase58("Ady55LhZxWFABzdg8NCNTAZv5XstBqyNZYCMfWqW3Rq9"),
    "system",
    "Wallet",
    undefined,
  );
  await assertAccountState(
    service,
    pubkeyFromBase58("UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j"),
    "bpf_loader_upgradeable",
    "Program",
    { program_data: "9rtcXuviJngSZTRSCXxsHyd6qaWpqWSQ56SNumXAuLJ1" },
  );
  await assertAccountState(
    service,
    pubkeyFromBase58("9rtcXuviJngSZTRSCXxsHyd6qaWpqWSQ56SNumXAuLJ1"),
    "bpf_loader_upgradeable",
    "ProgramData",
    {
      slot: "347133692",
      upgrade_authority: "7poxwHXi62Cwa57xdrpfoW2bUF7s8iXm1CU4jJqYPhu",
    },
  );
  await assertAccountState(
    service,
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
    service,
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
  service: Service,
  accountAddress: Pubkey,
  expectedProgramName: string,
  expectedAccountName: string,
  expectedState: JsonValue,
) {
  const { programInfo, accountInfo } =
    await service.getAndInferAndDecodeAccountInfo(accountAddress);
  expect(programInfo.idl.metadata.name).toStrictEqual(expectedProgramName);
  expect(accountInfo.idl.name).toStrictEqual(expectedAccountName);
  expect(accountInfo.state).toStrictEqual(expectedState);
}
