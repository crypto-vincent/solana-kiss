import { jsonDecodeNumber, jsonDecoderObject } from "../data/Json";
import { Lamports } from "../data/Lamports";
import { Pubkey } from "../data/Pubkey";
import { RpcHttp } from "./RpcHttp";
import { Commitment } from "./RpcTypes";

export async function rpcHttpGetAccountLamports(
  rpcHttp: RpcHttp,
  accountAddress: Pubkey,
  context?: {
    commitment?: Commitment;
  },
): Promise<Lamports> {
  const result = resultDecode(
    await rpcHttp("getBalance", [
      accountAddress,
      { commitment: context?.commitment },
    ]),
  );
  return BigInt(result.value);
}

const resultDecode = jsonDecoderObject({
  value: jsonDecodeNumber,
});
