import {
  Lamports,
  Pubkey,
  base64Decode,
  jsonDecodeBoolean,
  jsonDecodeNumber,
  jsonDecodeString,
  jsonDecoderArrayToTuple,
  jsonDecoderConst,
  jsonDecoderNullable,
  jsonDecoderObject,
  pubkeyDefault,
} from "solana-kiss-data";
import { RpcHttp } from "./RpcHttp";
import { Commitment } from "./RpcTypes";

export async function rpcHttpGetAccountWithData(
  rpcHttp: RpcHttp,
  accountAddress: Pubkey,
  context?: {
    commitment?: Commitment;
  },
): Promise<{
  executable: boolean;
  lamports: Lamports;
  owner: Pubkey;
  data: Uint8Array;
}> {
  const result = resultDecode(
    await rpcHttp("getAccountInfo", [
      accountAddress,
      {
        commitment: context?.commitment,
        encoding: "base64",
      },
    ]),
  );
  if (result.value === null) {
    return {
      executable: false,
      lamports: 0n,
      owner: pubkeyDefault(),
      data: new Uint8Array(0),
    };
  }
  const value = result.value;
  const executable = value.executable;
  const lamports = BigInt(value.lamports);
  const owner = value.owner;
  const data = base64Decode(value.data[0]!);
  if (data.length != value.space) {
    throw new Error(
      `RpcHttp: Expected account data length (${data.length}) to match space (${value.space})`,
    );
  }
  return { executable, lamports, owner, data };
}

const resultDecode = jsonDecoderObject({
  value: jsonDecoderNullable(
    jsonDecoderObject({
      executable: jsonDecodeBoolean,
      lamports: jsonDecodeNumber,
      owner: jsonDecodeString,
      data: jsonDecoderArrayToTuple([
        jsonDecodeString,
        jsonDecoderConst("base64"),
      ]),
      space: jsonDecodeNumber,
    }),
  ),
});
