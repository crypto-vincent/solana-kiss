import { inflate } from "uzip";
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

export function idlStoreAnchorFind(programAddress: Pubkey): Pubkey {
  const basePdaAddress = pubkeyFindPdaAddress(programAddress, []);
  return pubkeyCreateFromSeed(basePdaAddress, "anchor:idl", programAddress);
}

export function idlStoreAnchorParse(anchorStoreData: Uint8Array): IdlProgram {
  const anchorStoreInfo = storeJsonDecoder(
    idlAccountDecode(storeAccountIdl, anchorStoreData),
  );
  const anchorStoreBytes = inflate(anchorStoreInfo.data);
  const anchorStoreString = new TextDecoder().decode(anchorStoreBytes);
  const anchorStoreJson = JSON.parse(anchorStoreString) as JsonValue;
  return idlProgramParse(anchorStoreJson);
}

const storeAccountIdl = idlAccountParse("Idl", {
  discriminator: [24, 70, 98, 191, 58, 144, 123, 158],
  fields: [
    { name: "authority", type: "pubkey" },
    { name: "data", type: { vec32: "u8" } },
  ],
});
const storeJsonDecoder = jsonDecoderObject((key) => key, {
  authority: jsonTypePubkey.decoder,
  data: jsonTypeBytesArray.decoder,
});
