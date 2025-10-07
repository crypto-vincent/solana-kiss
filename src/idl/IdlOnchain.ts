import { inflate } from "uzip";
import { casingCamelToSnake } from "../data/Casing";
import {
  JsonValue,
  jsonDecoderObject,
  jsonTypeBytesArray,
  jsonTypePubkey,
} from "../data/Json";
import {
  Pubkey,
  pubkeyCreateFromSeed,
  pubkeyFindPdaAddress,
} from "../data/Pubkey";
import { idlAccountDecode, idlAccountParse } from "./IdlAccount";
import { IdlProgram, idlProgramParse } from "./IdlProgram";

export function idlOnchainAnchorAddress(programAddress: Pubkey): Pubkey {
  const basePdaAddress = pubkeyFindPdaAddress(programAddress, []);
  return pubkeyCreateFromSeed(basePdaAddress, "anchor:idl", programAddress);
}

export function idlOnchainAnchorDeserialize(
  anchorStoreData: Uint8Array,
): IdlProgram {
  const onchainAnchorContent = onchainAnchorJsonDecoder(
    idlAccountDecode(onchainAnchorIdl, anchorStoreData),
  );
  const onchainAnchorBytes = inflate(onchainAnchorContent.deflatedJson);
  const onchainAnchorJson = new TextDecoder().decode(onchainAnchorBytes);
  return idlProgramParse(JSON.parse(onchainAnchorJson) as JsonValue);
}

// TODO - this should probably be automatic in the program library
const onchainAnchorIdl = idlAccountParse("Idl", {
  discriminator: [24, 70, 98, 191, 58, 144, 123, 158],
  fields: [
    { name: "authority", type: "pubkey" },
    { name: "deflated_json", type: { vec32: "u8" } },
  ],
});
const onchainAnchorJsonDecoder = jsonDecoderObject(casingCamelToSnake, {
  authority: jsonTypePubkey.decoder,
  deflatedJson: jsonTypeBytesArray.decoder,
});
