import { base64Decode } from "../data/Base64";
import {
  jsonCodecBoolean,
  jsonCodecNumber,
  jsonCodecPubkey,
  jsonCodecString,
  jsonDecoderArrayToObject,
  jsonDecoderConst,
  jsonDecoderObject,
  jsonDecoderOptional,
} from "../data/Json";
import { Pubkey, pubkeyDefault, pubkeyToBase58 } from "../data/Pubkey";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpGetAccountWithData(
  self: RpcHttp,
  accountAddress: Pubkey,
): Promise<{
  accountInfo: {
    executable: boolean;
    lamports: bigint;
    owner: Pubkey;
    data: Uint8Array;
  };
}> {
  const result = resultJsonDecoder(
    await self("getAccountInfo", [pubkeyToBase58(accountAddress)], {
      encoding: "base64",
    }),
  );
  if (result.value === undefined) {
    return {
      accountInfo: {
        executable: false,
        lamports: 0n,
        owner: pubkeyDefault,
        data: new Uint8Array(0),
      },
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
  return { accountInfo: { executable, lamports, owner, data } };
}

const resultJsonDecoder = jsonDecoderObject({
  value: jsonDecoderOptional(
    jsonDecoderObject({
      executable: jsonCodecBoolean.decoder,
      lamports: jsonCodecNumber.decoder,
      owner: jsonCodecPubkey.decoder,
      data: jsonDecoderArrayToObject({
        encoded: jsonCodecString.decoder,
        encoding: jsonDecoderConst("base64"),
      }),
      space: jsonCodecNumber.decoder,
    }),
  ),
});
