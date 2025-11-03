import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlAccountDecode,
  idlInstructionAddressesFind,
  IdlProgram,
  idlProgramGuessAccount,
  idlProgramParse,
  jsonCodecObjectRaw,
  JsonValue,
  Pubkey,
  pubkeyFindPdaAddress,
  pubkeyFromBase58,
  RpcHttp,
  rpcHttpFromUrl,
  rpcHttpGetAccountWithData,
  urlPublicRpcDevnet,
  utf8Encode,
} from "../src";

it("run", async () => {
  // Create the endpoint
  const rpcHttp = rpcHttpFromUrl(urlPublicRpcDevnet);
  // Choosing our programAddress
  const programAddress = pubkeyFromBase58(
    "UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j",
  );
  // Parse IDL from file JSON directly
  const programIdl = idlProgramParse(require("./fixtures/idl_anchor_30.json"));
  // Read the global market state content using the IDL
  const campaign = pubkeyFindPdaAddress(programAddress, [
    utf8Encode("Campaign"),
    new Uint8Array(8).fill(0),
  ]);
  await assertAccountInfo(
    rpcHttp,
    programIdl,
    campaign,
    "Campaign",
    "collateral_mint",
    "EsQycjp856vTPvrxMuH1L6ymd5K63xT7aULGepiTcgM3",
  );
  // Check that we could indeed find the right accounts programatically
  const instructionAddresses = idlInstructionAddressesFind(
    expectDefined(programIdl.instructions.get("campaign_create")),
    {
      instructionProgramAddress: programAddress,
      instructionAddresses: {},
      instructionPayload: { params: { index: "0" } },
    },
  );
  expect(instructionAddresses["campaign"]).toStrictEqual(campaign);
});

async function assertAccountInfo(
  rpcHttp: RpcHttp,
  programIdl: IdlProgram,
  accountAddress: Pubkey,
  accountName: string,
  accountStateKey: string,
  accountStateValue: JsonValue,
) {
  const { accountInfo } = await rpcHttpGetAccountWithData(
    rpcHttp,
    accountAddress,
  );
  const accountIdl = expectDefined(
    idlProgramGuessAccount(programIdl, accountInfo.data),
  );
  const accountState = idlAccountDecode(accountIdl, accountInfo.data);
  expect(accountIdl.name).toStrictEqual(accountName);
  expect(
    jsonCodecObjectRaw.decoder(accountState)[accountStateKey],
  ).toStrictEqual(accountStateValue);
}
