import {
  Pubkey,
  base64Decode,
  jsonDecoderArrayToObject,
  jsonDecoderConst,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonTypeBoolean,
  jsonTypeNumber,
  jsonTypePubkey,
  jsonTypeString,
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
  lamports: bigint;
  owner: Pubkey;
  data: Uint8Array;
}> {
  const result = resultJsonDecoder(
    await rpcHttp("getAccountInfo", [
      jsonTypePubkey.encoder(accountAddress),
      {
        commitment: context?.commitment,
        encoding: "base64",
      },
    ]),
  );
  if (result.value === undefined) {
    return {
      executable: false,
      lamports: 0n,
      owner: pubkeyDefault,
      data: new Uint8Array(0),
    };
  }
  const value = result.value;
  const executable = value.executable;
  const lamports = BigInt(value.lamports);
  const owner = value.owner;
  const data = base64Decode(value.data.encoded);
  if (data.length != value.space) {
    throw new Error(
      `RpcHttp: Expected account data length (${data.length}) to match space (${value.space})`,
    );
  }
  return { executable, lamports, owner, data };
}

const resultJsonDecoder = jsonDecoderObject({
  value: jsonDecoderOptional(
    jsonDecoderObject({
      executable: jsonTypeBoolean.decoder,
      lamports: jsonTypeNumber.decoder,
      owner: jsonTypePubkey.decoder,
      data: jsonDecoderArrayToObject({
        encoded: jsonTypeString.decoder,
        encoding: jsonDecoderConst("base64"),
      }),
      space: jsonTypeNumber.decoder,
    }),
  ),
});
