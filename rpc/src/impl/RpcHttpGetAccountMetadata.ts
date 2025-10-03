import {
  jsonDecodeBoolean,
  jsonDecodeNumber,
  jsonDecoderNullable,
  jsonDecoderObject,
  jsonDecodeString,
  Lamports,
  Pubkey,
  pubkeyDefault,
} from "solana-kiss-data";
import { RpcHttp } from "./RpcHttp";
import { Commitment } from "./RpcTypes";

export async function rpcHttpGetAccountMetadata(
  rpcHttp: RpcHttp,
  accountAddress: Pubkey,
  context?: {
    commitment?: Commitment;
  },
): Promise<{
  executable: boolean;
  lamports: Lamports;
  owner: Pubkey;
  space: number;
}> {
  const result = resultDecode(
    await rpcHttp("getAccountInfo", [
      accountAddress,
      {
        commitment: context?.commitment,
        dataSlice: { offset: 0, length: 0 },
        encoding: "base64",
      },
    ]),
  );
  if (result.value === null) {
    return {
      executable: false,
      lamports: 0n,
      owner: pubkeyDefault(),
      space: 0,
    };
  }
  const value = result.value;
  const executable = value.executable;
  const lamports = BigInt(value.lamports);
  const owner = value.owner;
  const space = value.space;
  return { executable, lamports, owner, space };
}

const resultDecode = jsonDecoderObject({
  value: jsonDecoderNullable(
    jsonDecoderObject({
      executable: jsonDecodeBoolean,
      lamports: jsonDecodeNumber,
      owner: jsonDecodeString,
      space: jsonDecodeNumber,
    }),
  ),
});
