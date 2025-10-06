import { jsonDecoderObject, jsonTypeNumber } from "../data/Json";
import { Pubkey, pubkeyToBase58 } from "../data/Pubkey";
import { RpcHttp } from "./RpcHttp";
import { Commitment } from "./RpcTypes";

export async function rpcHttpGetAccountLamports(
  rpcHttp: RpcHttp,
  accountAddress: Pubkey,
  context?: {
    commitment?: Commitment;
  },
): Promise<bigint> {
  const result = resultJsonDecoder(
    await rpcHttp("getBalance", [
      pubkeyToBase58(accountAddress),
      { commitment: context?.commitment },
    ]),
  );
  return BigInt(result.value);
}

const resultJsonDecoder = jsonDecoderObject((key) => key, {
  value: jsonTypeNumber.decoder,
});
