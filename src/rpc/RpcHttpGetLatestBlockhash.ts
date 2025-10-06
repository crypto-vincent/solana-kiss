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

const resultJsonDecoder = jsonDecoderObject((key) => key, {
  context: jsonDecoderObject((key) => key, {
    slot: jsonTypeNumber.decoder,
  }),
  value: jsonDecoderObject((key) => key, {
    blockhash: jsonTypeBlockHash.decoder,
    lastValidBlockHeight: jsonTypeNumber.decoder,
  }),
});
