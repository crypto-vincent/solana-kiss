import { BlockHash } from "../data/Block";
import {
  jsonCodecBlockHash,
  jsonCodecNumber,
  jsonDecoderObject,
} from "../data/Json";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpGetLatestBlockHash(self: RpcHttp): Promise<{
  blockHash: BlockHash;
}> {
  const result = resultJsonDecoder(await self("getLatestBlockhash", [], {}));
  return { blockHash: result.value.blockhash };
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
