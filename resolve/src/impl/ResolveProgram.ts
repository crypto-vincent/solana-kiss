import {
  JsonValue,
  Pubkey,
  pubkeyCreateFromSeed,
  pubkeyFindPdaAddress,
} from "solana-kiss-data";
import { IdlProgram, idlProgramParse } from "solana-kiss-idl";
import { RpcHttp, rpcHttpGetAccountWithData } from "solana-kiss-rpc";
import { inflate } from "uzip";

export function resolveProgramAnchorIdlAddress(programAddress: Pubkey): Pubkey {
  const programBaseAddress = pubkeyFindPdaAddress(programAddress, []);
  return pubkeyCreateFromSeed(programAddress, programBaseAddress, "anchor:idl");
}

export async function resolveProgramAnchorIdl(
  rpcHttp: RpcHttp,
  programAddress: Pubkey,
): Promise<IdlProgram | undefined> {
  const idlAddress = resolveProgramAnchorIdlAddress(programAddress);
  const programRecord = await rpcHttpGetAccountWithData(rpcHttp, idlAddress);
  const programView = new DataView(programRecord.data.buffer);
  const idlLength = programView.getUint32(40, true);
  const idlDeflated = programRecord.data.slice(44, 44 + idlLength);
  // TODO -better error handling and checks and could use IDL parsing
  const idlBytes = inflate(idlDeflated);
  const idlString = new TextDecoder().decode(idlBytes);
  const idlJson = JSON.parse(idlString) as JsonValue;
  return idlProgramParse(idlJson);
}
