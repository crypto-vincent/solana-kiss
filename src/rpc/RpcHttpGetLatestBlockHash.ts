import { BlockHash } from "../data/Block";
import {
  jsonCodecBlockHash,
  jsonCodecNumber,
  jsonDecoderObjectToObject,
} from "../data/Json";
import { RpcHttp } from "./RpcHttp";

/**
 * Fetches the latest confirmed blockhash from the cluster.
 *
 * @param self - The {@link RpcHttp} client to use.
 * @returns An object containing `blockHash`, the most recent confirmed {@link BlockHash}.
 */
export async function rpcHttpGetLatestBlockHash(self: RpcHttp): Promise<{
  blockHash: BlockHash;
}> {
  const result = resultJsonDecoder(
    await self("getLatestBlockhash", [], undefined),
  );
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
