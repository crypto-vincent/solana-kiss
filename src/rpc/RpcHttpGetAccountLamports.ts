import { jsonCodecNumber, jsonDecoderObject } from "../data/Json";
import { Pubkey, pubkeyToBase58 } from "../data/Pubkey";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpGetAccountLamports(
  self: RpcHttp,
  accountAddress: Pubkey,
): Promise<{
  accountLamports: bigint;
}> {
  const result = resultJsonDecoder(
    await self("getBalance", [pubkeyToBase58(accountAddress)], {}),
  );
  return { accountLamports: BigInt(result.value) };
}

const resultJsonDecoder = jsonDecoderObject({
  value: jsonCodecNumber.decoder,
});
