import { inflate } from "../data/Inflate";
import {
  jsonCodecArrayToBytes,
  jsonCodecObjectToObject,
  jsonCodecPubkey,
  JsonValue,
} from "../data/Json";
import {
  Pubkey,
  pubkeyCreateFromSeed,
  pubkeyFindPdaAddress,
} from "../data/Pubkey";
import { utf8Decode } from "../data/Utf8";
import { idlAccountDecode, idlAccountParse } from "./IdlAccount";
import { IdlLoader } from "./IdlLoader";
import { idlProgramParse } from "./IdlProgram";

/** Creates an IDL loader that reads and parses Anchor-format IDLs stored on-chain in a program's associated metadata account. */
export function idlLoaderFromOnchainAnchor(
  accountDataFetcher: (accountAddress: Pubkey) => Promise<Uint8Array>,
): IdlLoader {
  return async (programAddress: Pubkey) => {
    const idlAddress = pubkeyCreateFromSeed(
      pubkeyFindPdaAddress(programAddress, []),
      "anchor:idl",
      programAddress,
    );
    const idlData = await accountDataFetcher(idlAddress);
    const { accountState: idlState } = idlAccountDecode(
      anchorIdlAccount,
      idlData,
    );
    const idlContent = anchorIdlJsonCodec.decoder(idlState);
    const idlBytes = inflate(idlContent.deflatedJson, null);
    const idlString = utf8Decode(idlBytes);
    const idlJson = JSON.parse(idlString) as JsonValue;
    const programIdl = idlProgramParse(idlJson);
    programIdl.metadata.address = programAddress;
    programIdl.metadata.source = `onchain://anchor-program`;
    return programIdl;
  };
}

const anchorIdlAccount = idlAccountParse(
  "anchor:idl",
  {
    discriminator: [24, 70, 98, 191, 58, 144, 123, 158],
    fields: [
      { name: "authority", type: "pubkey" },
      { name: "deflated_json", type: { vec32: "u8" } },
    ],
  },
  new Map(),
);

const anchorIdlJsonCodec = jsonCodecObjectToObject({
  authority: jsonCodecPubkey,
  deflatedJson: jsonCodecArrayToBytes,
});
