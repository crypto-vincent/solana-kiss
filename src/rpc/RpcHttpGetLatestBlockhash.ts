import { BlockHash } from "../data/Block";
import {
  jsonDecoderObject,
  jsonTypeBlockHash,
  jsonTypeNumber,
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
    slot: jsonTypeNumber.decoder,
  }),
  value: jsonDecoderObject({
    blockhash: jsonTypeBlockHash.decoder,
    lastValidBlockHeight: jsonTypeNumber.decoder,
  }),
});
