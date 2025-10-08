import {
  jsonCodecBoolean,
  jsonCodecNumber,
  jsonCodecPubkey,
  jsonDecoderObject,
  jsonDecoderOptional,
} from "../data/Json";
import { Pubkey, pubkeyDefault, pubkeyToBase58 } from "../data/Pubkey";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpGetAccountMetadata(
  rpcHttp: RpcHttp,
  accountAddress: Pubkey,
): Promise<{
  accountInfo: {
    executable: boolean;
    lamports: bigint;
    owner: Pubkey;
    space: number;
  };
}> {
  const result = resultJsonDecoder(
    await rpcHttp("getAccountInfo", [pubkeyToBase58(accountAddress)], {
      dataSlice: { offset: 0, length: 0 },
      encoding: "base64",
    }),
  );
  if (result.value === undefined) {
    return {
      accountInfo: {
        executable: false,
        lamports: 0n,
        owner: pubkeyDefault,
        space: 0,
      },
    };
  }
  const value = result.value;
  const executable = value.executable;
  const lamports = BigInt(value.lamports);
  const owner = value.owner;
  const space = value.space;
  return { accountInfo: { executable, lamports, owner, space } };
}

const resultJsonDecoder = jsonDecoderObject({
  value: jsonDecoderOptional(
    jsonDecoderObject({
      executable: jsonCodecBoolean.decoder,
      lamports: jsonCodecNumber.decoder,
      owner: jsonCodecPubkey.decoder,
      space: jsonCodecNumber.decoder,
    }),
  ),
});
