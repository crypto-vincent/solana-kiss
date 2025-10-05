import {
  JsonValue,
  Pubkey,
  pubkeyCreateFromSeed,
  pubkeyFindPdaAddress,
} from "solana-kiss-data";
import {
  IdlProgram,
  idlProgramParse,
  idlUtilsExpectBlobAt,
} from "solana-kiss-idl";
import { RpcHttp, rpcHttpGetAccountWithData } from "solana-kiss-rpc";
import { inflate } from "uzip";

const anchorIdlDiscriminator = new Uint8Array([
  24, 70, 98, 191, 58, 144, 123, 158,
]);

export function resolveProgramAnchorIdlAddress(programAddress: Pubkey): Pubkey {
  const basePdaAddress = pubkeyFindPdaAddress(programAddress, []);
  return pubkeyCreateFromSeed(basePdaAddress, "anchor:idl", programAddress);
}

export async function resolveProgramAnchorIdl(
  rpcHttp: RpcHttp,
  programAddress: Pubkey,
): Promise<IdlProgram | undefined> {
  const idlAddress = resolveProgramAnchorIdlAddress(programAddress);
  const programRecord = await rpcHttpGetAccountWithData(rpcHttp, idlAddress);
  const programView = new DataView(programRecord.data.buffer);
  idlUtilsExpectBlobAt(0, anchorIdlDiscriminator, programRecord.data);
  const idlLength = programView.getUint32(40, true);
  const idlDeflated = programRecord.data.slice(44, 44 + idlLength);
  // TODO - better error handling and checks and could use IDL parsing
  const idlBytes = inflate(idlDeflated);
  const idlString = new TextDecoder().decode(idlBytes);
  const idlJson = JSON.parse(idlString) as JsonValue;
  return idlProgramParse(idlJson);
}

// TODO - provide phantom integration
