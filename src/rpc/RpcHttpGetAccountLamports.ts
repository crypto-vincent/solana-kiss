import { jsonCodecNumber, jsonDecoderObject } from "../data/Json";
import { Pubkey, pubkeyToBase58 } from "../data/Pubkey";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpGetAccountLamports(
  rpcHttp: RpcHttp,
  accountAddress: Pubkey,
): Promise<bigint> {
  const result = resultJsonDecoder(
    await rpcHttp("getBalance", [pubkeyToBase58(accountAddress)], {}),
  );
  return BigInt(result.value);
}

const resultJsonDecoder = jsonDecoderObject({
  value: jsonCodecNumber.decoder,
});
