import {
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonTypeBoolean,
  jsonTypeNumber,
  jsonTypePubkey,
  Pubkey,
  pubkeyDefault,
  pubkeyToString,
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
  lamports: bigint;
  owner: Pubkey;
  space: number;
}> {
  const result = resultJsonDecoder(
    await rpcHttp("getAccountInfo", [
      pubkeyToString(accountAddress),
      {
        commitment: context?.commitment,
        dataSlice: { offset: 0, length: 0 },
        encoding: "base64",
      },
    ]),
  );
  if (result.value === undefined) {
    return {
      executable: false,
      lamports: 0n,
      owner: pubkeyDefault,
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

const resultJsonDecoder = jsonDecoderObject({
  value: jsonDecoderOptional(
    jsonDecoderObject({
      executable: jsonTypeBoolean.decoder,
      lamports: jsonTypeNumber.decoder,
      owner: jsonTypePubkey.decoder,
      space: jsonTypeNumber.decoder,
    }),
  ),
});
