import { JsonValue, Pubkey, pubkeyFindPdaAddress } from "solana-kiss-data";
import { IdlProgram, idlProgramParse } from "solana-kiss-idl";
import { RpcHttp, rpcHttpGetAccountWithData } from "solana-kiss-rpc";
import { inflate } from "uzip";
import { resolveAnchorIdlAddress } from "./ResolveAnchor";

export function resolveProgramAnchorIdlAddress(programAddress: Pubkey): Pubkey {
  const programBaseAddress = pubkeyFindPdaAddress(programAddress, []);
  return pubkeyCreateFromSeed(programAddress, programBaseAddress, "anchor:idl");
}

export async function resolveProgramIdl(
  rpcHttp: RpcHttp,
  programAddress: Pubkey,
): Promise<IdlProgram | undefined> {
  const anchorIdlAddress = resolveAnchorIdlAddress(programAddress);
  const programRecord = await rpcHttpGetAccountWithData(
    rpcHttp,
    anchorIdlAddress,
  );
  const programView = new DataView(programRecord.data.buffer);
  const length = programView.getUint32(40, true);
  const deflated = programRecord.data.slice(44, 44 + length);
  // TODO -better error handling and checks and could use IDL parsing
  const encoded = inflate(deflated);
  const decoded = new TextDecoder().decode(encoded);
  return idlProgramParse(JSON.parse(decoded) as JsonValue);
}
