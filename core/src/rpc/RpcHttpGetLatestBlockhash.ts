import { Blockhash } from "../data/Execution";
import {
  jsonDecodeNumber,
  jsonDecoderObject,
  jsonDecodeString,
} from "../data/Json";
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
    slot: jsonDecodeNumber,
  }),
  value: jsonDecoderObject({
    blockhash: jsonDecodeString,
    lastValidBlockHeight: jsonDecodeNumber,
  }),
});
