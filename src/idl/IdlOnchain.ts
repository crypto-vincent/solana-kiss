import { inflate } from "uzip";
import {
  JsonValue,
  jsonCodecBytesArray,
  jsonCodecObjectWithKeysSnakeEncoded,
  jsonCodecPubkey,
} from "../data/Json";
import {
  Pubkey,
  pubkeyCreateFromSeed,
  pubkeyFindPdaAddress,
} from "../data/Pubkey";
import { utf8Decode } from "../data/Utf8";
import { idlAccountDecode, idlAccountParse } from "./IdlAccount";
import { IdlProgram, idlProgramParse } from "./IdlProgram";

// TODO - should this be idlLibrary instead of idlOnchain ?

export function idlOnchainAnchorAddress(programAddress: Pubkey): Pubkey {
  const fromPdaAddress = pubkeyFindPdaAddress(programAddress, []);
  return pubkeyCreateFromSeed(fromPdaAddress, "anchor:idl", programAddress);
}

export function idlOnchainAnchorDecode(
  onchainAnchorData: Uint8Array,
): IdlProgram {
  const onchainAnchorContent = idlOnchainAnchorJsonCodec.decoder(
    idlAccountDecode(idlOnchainAnchorAccount, onchainAnchorData),
  );
  const onchainAnchorBytes = inflate(onchainAnchorContent.deflatedJson);
  const onchainAnchorString = utf8Decode(onchainAnchorBytes);
  const onchainAnchorJson = JSON.parse(onchainAnchorString) as JsonValue;
  return idlProgramParse(onchainAnchorJson);
}

// TODO - provide definition for the idl upload IXs too
export const idlOnchainAnchorAccount = idlAccountParse("AnchorIdl", {
  discriminator: [24, 70, 98, 191, 58, 144, 123, 158],
  fields: [
    { name: "authority", type: "pubkey" },
    { name: "deflated_json", type: { vec32: "u8" } },
  ],
});

export const idlOnchainAnchorJsonCodec = jsonCodecObjectWithKeysSnakeEncoded({
  authority: jsonCodecPubkey,
  deflatedJson: jsonCodecBytesArray,
});
