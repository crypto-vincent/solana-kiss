import { BlockHash } from "../data/Block";
import {
  jsonCodecBlockHash,
  jsonCodecNumber,
  jsonDecoderObjectToObject,
} from "../data/Json";
import { RpcHttp } from "./RpcHttp";

/** Fetches the most recent block hash from the cluster. */

export async function rpcHttpGetLatestBlockHash(self: RpcHttp): Promise<{
  blockHash: BlockHash;
}> {
  const result = resultJsonDecoder(await self("getLatestBlockhash", [], {}));
  return { blockHash: result.value.blockhash };
}

const resultJsonDecoder = jsonDecoderObjectToObject({
  context: jsonDecoderObjectToObject({
    slot: jsonCodecNumber.decoder,
  }),
  value: jsonDecoderObjectToObject({
    blockhash: jsonCodecBlockHash.decoder,
    lastValidBlockHeight: jsonCodecNumber.decoder,
  }),
});
