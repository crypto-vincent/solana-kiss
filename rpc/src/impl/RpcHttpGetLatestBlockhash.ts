import {
  Blockhash,
  jsonDecoderObject,
  jsonTypeNumber,
  jsonTypeString,
} from "solana-kiss-data";
import { RpcHttp } from "./RpcHttp";
import { Commitment } from "./RpcTypes";

export async function rpcHttpGetLatestBlockhash(
  rpcHttp: RpcHttp,
  context?: {
    commitment?: Commitment;
  },
): Promise<Blockhash> {
  const result = resultDecode(
    await rpcHttp("getLatestBlockhash", [{ commitment: context?.commitment }]),
  );
  return result.value.blockhash;
}

const resultDecode = jsonDecoderObject({
  context: jsonDecoderObject({
    slot: jsonTypeNumber.decode,
  }),
  value: jsonDecoderObject({
    blockhash: jsonTypeString.decode,
    lastValidBlockHeight: jsonTypeNumber.decode,
  }),
});
