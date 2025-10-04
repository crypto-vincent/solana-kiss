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
  const result = resultJsonDecoder(
    await rpcHttp("getLatestBlockhash", [{ commitment: context?.commitment }]),
  );
  return result.value.blockhash;
}

const resultJsonDecoder = jsonDecoderObject({
  context: jsonDecoderObject({
    slot: jsonTypeNumber.decoder,
  }),
  value: jsonDecoderObject({
    blockhash: jsonTypeString.decoder,
    lastValidBlockHeight: jsonTypeNumber.decoder,
  }),
});
