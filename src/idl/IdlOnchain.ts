import { inflate } from "uzip";
import {
  JsonValue,
  jsonCodecBytesArray,
  jsonCodecPubkey,
  jsonDecoderObjectWithKeysSnakeEncoded,
} from "../data/Json";
import {
  Pubkey,
  pubkeyCreateFromSeed,
  pubkeyFindPdaAddress,
} from "../data/Pubkey";
import { utf8Decode } from "../data/Utf8";
import { idlAccountDecode, idlAccountParse } from "./IdlAccount";
import { IdlProgram, idlProgramParse } from "./IdlProgram";

export function idlOnchainAnchorAddress(programAddress: Pubkey): Pubkey {
  const basePdaAddress = pubkeyFindPdaAddress(programAddress, []);
  return pubkeyCreateFromSeed(basePdaAddress, "anchor:idl", programAddress);
}

export function idlOnchainAnchorDecode(
  onchainAnchorData: Uint8Array,
): IdlProgram {
  const onchainAnchorContent = onchainAnchorJsonDecoder(
    idlAccountDecode(onchainAnchorIdl, onchainAnchorData),
  );
  const onchainAnchorBytes = inflate(onchainAnchorContent.deflatedJson);
  const onchainAnchorString = utf8Decode(onchainAnchorBytes);
  const onchainAnchorJson = JSON.parse(onchainAnchorString) as JsonValue;
  return idlProgramParse(onchainAnchorJson);
}

// TODO - this should probably be automatic in the program library
const onchainAnchorIdl = idlAccountParse("Idl", {
  discriminator: [24, 70, 98, 191, 58, 144, 123, 158],
  fields: [
    { name: "authority", type: "pubkey" },
    { name: "deflated_json", type: { vec32: "u8" } },
  ],
});
const onchainAnchorJsonDecoder = jsonDecoderObjectWithKeysSnakeEncoded({
  authority: jsonCodecPubkey.decoder,
  deflatedJson: jsonCodecBytesArray.decoder,
});
