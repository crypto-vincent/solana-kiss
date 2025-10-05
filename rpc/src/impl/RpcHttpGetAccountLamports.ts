import {
  Pubkey,
  jsonDecoderObject,
  jsonTypeNumber,
  pubkeyToString,
} from "solana-kiss-data";
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
      pubkeyToString(accountAddress),
      { commitment: context?.commitment },
    ]),
  );
  return BigInt(result.value);
}

const resultJsonDecoder = jsonDecoderObject({
  value: jsonTypeNumber.decoder,
});
