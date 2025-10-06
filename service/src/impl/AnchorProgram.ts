import {
  jsonTypeArray,
  jsonTypeNumber,
  jsonTypePubkey,
  JsonValue,
  Pubkey,
  pubkeyCreateFromSeed,
  pubkeyFindPdaAddress,
} from "solana-kiss-data";
import { idlAccountDecode, IdlProgram, idlProgramParse } from "solana-kiss-idl";
import { RpcHttp, rpcHttpGetAccountWithData } from "solana-kiss-rpc";
import { inflate } from "uzip";

export function anchorProgramIdlFind(programAddress: Pubkey): Pubkey {
  const basePdaAddress = pubkeyFindPdaAddress(programAddress, []);
  return pubkeyCreateFromSeed(basePdaAddress, "anchor:idl", programAddress);
}

export function anchorProgramIdlParse(
  anchorProgramIdlData: Uint8Array,
): Promise<IdlProgram> {
  const state = idlAccountDecode(anchorProgramIdlAccount, anchorProgramIdlData);
  const anchorProgramIdl;
  const idlBytes = inflate(idlDeflated);
  const idlString = new TextDecoder().decode(idlBytes);
  const idlJson = JSON.parse(idlString) as JsonValue;
  return idlProgramParse(idlJson);
}

export async function anchorProgramIdlFetch(
  rpcHttp: RpcHttp,
  programAddress: Pubkey,
): Promise<IdlProgram | undefined> {
  const anchorProgramIdlAddress = anchorProgramIdlFind(programAddress);
  const anchorProgramIdlWithData = await rpcHttpGetAccountWithData(
    rpcHttp,
    anchorProgramIdlAddress,
  );
  if (anchorProgramIdlWithData.data.length === 0) {
    return undefined;
  }
  return anchorProgramIdlParse(anchorProgramIdlWithData.data);
}

const anchorProgramIdlAccount = idlProgramParse({
  accounts: {
    Idl: {
      discriminator: [24, 70, 98, 191, 58, 144, 123, 158],
      fields: [
        { name: "authority", type: "pubkey" },
        { name: "data", type: { vec32: "u8" } },
      ],
    },
  },
}).accounts.get("Idl")!;
const anchorProgramIdlJsonDecoder = {
  authority: jsonTypePubkey,
  data: jsonTypeArray(jsonTypeNumber),
};

// TODO - provide phantom integration
