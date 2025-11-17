import { expect, it } from "@jest/globals";
import {
  idlProgramParse,
  jsonCodecObjectValues,
  JsonValue,
  Pubkey,
  pubkeyFindPdaAddress,
  pubkeyFromBase58,
  rpcHttpFromUrl,
  Solana,
  urlRpcPublicDevnet,
  utf8Encode,
} from "../src";

it("run", async () => {
  // Create the endpoint
  const solana = new Solana(rpcHttpFromUrl(urlRpcPublicDevnet));
  // Choosing our programAddress
  const programAddress = pubkeyFromBase58(
    "UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j",
  );
  // Parse IDL from file JSON directly
  solana.setProgramIdl(
    programAddress,
    idlProgramParse(require("./fixtures/idl_anchor_30.json")),
  );
  // Read the global market state content using the IDL
  const campaign = pubkeyFindPdaAddress(programAddress, [
    utf8Encode("Campaign"),
    new Uint8Array(8).fill(0),
  ]);
  await assertAccountNameAndState(
    solana,
    campaign,
    "Campaign",
    "collateralMint",
    "EsQycjp856vTPvrxMuH1L6ymd5K63xT7aULGepiTcgM3",
  );
  // Check that we could indeed find the right accounts programatically
  const { instructionAddresses } = await solana.hydrateInstructionAddresses(
    programAddress,
    "campaign_create",
    {
      instructionPayload: {
        params: { index: "0" },
      },
    },
  );
  expect(instructionAddresses["campaign"]).toStrictEqual(campaign);
});

async function assertAccountNameAndState(
  solana: Solana,
  accountAddress: Pubkey,
  accountName: string,
  accountStateKey: string,
  accountStateValue: JsonValue,
) {
  const { accountIdl, accountState } =
    await solana.getAndInferAndDecodeAccount(accountAddress);
  expect(accountIdl.name).toStrictEqual(accountName);
  expect(
    jsonCodecObjectValues.decoder(accountState)[accountStateKey],
  ).toStrictEqual(accountStateValue);
}
