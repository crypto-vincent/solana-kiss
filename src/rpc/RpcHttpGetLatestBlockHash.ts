import { BlockHash } from "../data/Block";
import {
  jsonCodecBlockHash,
  jsonCodecNumber,
  jsonDecoderObject,
} from "../data/Json";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpGetLatestBlockHash(
  rpcHttp: RpcHttp,
): Promise<BlockHash> {
  const result = resultJsonDecoder(await rpcHttp("getLatestBlockhash", [], {}));
  return result.value.blockhash;
}

const resultJsonDecoder = jsonDecoderObject({
  context: jsonDecoderObject({
    slot: jsonCodecNumber.decoder,
  }),
  value: jsonDecoderObject({
    blockhash: jsonCodecBlockHash.decoder,
    lastValidBlockHeight: jsonCodecNumber.decoder,
  }),
});
