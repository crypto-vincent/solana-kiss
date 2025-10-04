import {
  Lamports,
  Pubkey,
  jsonDecoderObject,
  jsonTypeNumber,
} from "solana-kiss-data";
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
  value: jsonTypeNumber.decode,
});
