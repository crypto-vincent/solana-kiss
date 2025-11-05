import { expect, it } from "@jest/globals";
import {
  idlProgramParse,
  jsonCodecObjectRaw,
  JsonValue,
  Pubkey,
  pubkeyFindPdaAddress,
  pubkeyFromBase58,
  rpcHttpFromUrl,
  Service,
  urlPublicRpcDevnet,
  utf8Encode,
} from "../src";

it("run", async () => {
  // Create the endpoint
  const service = new Service(rpcHttpFromUrl(urlPublicRpcDevnet));
  // Choosing our programAddress
  const programAddress = pubkeyFromBase58(
    "UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j",
  );
  // Parse IDL from file JSON directly
  service.setProgramIdl(
    programAddress,
    idlProgramParse(require("./fixtures/idl_anchor_30.json")),
  );
  // Read the global market state content using the IDL
  const campaign = pubkeyFindPdaAddress(programAddress, [
    utf8Encode("Campaign"),
    new Uint8Array(8).fill(0),
  ]);
  await assertAccountInfo(
    service,
    campaign,
    "Campaign",
    "collateral_mint",
    "EsQycjp856vTPvrxMuH1L6ymd5K63xT7aULGepiTcgM3",
  );
  // Check that we could indeed find the right accounts programatically
  const instructionAddresses = await service.hydrateInstructionAddresses(
    programAddress,
    "campaign_create",
    { instructionPayload: { params: { index: "0" } } },
  );
  expect(instructionAddresses["campaign"]).toStrictEqual(campaign);
});

async function assertAccountInfo(
  service: Service,
  accountAddress: Pubkey,
  accountName: string,
  accountStateKey: string,
  accountStateValue: JsonValue,
) {
  const { accountInfo } =
    await service.getAndInferAndDecodeAccountInfo(accountAddress);
  expect(accountInfo.idl.name).toStrictEqual(accountName);
  expect(
    jsonCodecObjectRaw.decoder(accountInfo.state)[accountStateKey],
  ).toStrictEqual(accountStateValue);
}
