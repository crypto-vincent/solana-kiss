import { base64Decode } from "../data/Base64";
import {
  jsonDecoderArrayToObject,
  jsonDecoderConst,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonTypeBoolean,
  jsonTypeNumber,
  jsonTypePubkey,
  jsonTypeString,
} from "../data/Json";
import { Pubkey, pubkeyDefault, pubkeyToBase58 } from "../data/Pubkey";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpGetAccountWithData(
  rpcHttp: RpcHttp,
  accountAddress: Pubkey,
): Promise<{
  executable: boolean;
  lamports: bigint;
  owner: Pubkey;
  data: Uint8Array;
}> {
  const result = resultJsonDecoder(
    await rpcHttp("getAccountInfo", [pubkeyToBase58(accountAddress)], {
      encoding: "base64",
    }),
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
