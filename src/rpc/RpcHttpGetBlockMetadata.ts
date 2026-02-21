import { BlockHash, BlockSlot, blockSlotToNumber } from "../data/Block";
import {
  jsonCodecBlockHash,
  jsonCodecBlockSlot,
  jsonCodecNumber,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
} from "../data/Json";
import { RpcHttp } from "./RpcHttp";

/**
 * Fetches block metadata for the given slot, without transaction details.
 *
 * @param self - The {@link RpcHttp} client to use.
 * @param blockSlot - The {@link BlockSlot} to query.
 * @returns An object containing:
 *   - `previousBlockSlot` – the parent block's {@link BlockSlot}.
 *   - `blockHeight` – the block height, or `undefined` if not available.
 *   - `blockTime` – the block production time as a `Date`, or `undefined` if not available.
 *   - `blockHash` – the block's {@link BlockHash}.
 */
export async function rpcHttpGetBlockMetadata(
  self: RpcHttp,
  blockSlot: BlockSlot,
): Promise<{
  previousBlockSlot: BlockSlot;
  blockHeight: number | undefined;
  blockTime: Date | undefined;
  blockHash: BlockHash;
}> {
  const result = resultJsonDecoder(
    await self("getBlock", [blockSlotToNumber(blockSlot)], {
      encoding: "base64",
      rewards: false,
      maxSupportedTransactionVersion: 0,
      transactionDetails: "none",
    }),
  );
  return {
    previousBlockSlot: result.parentSlot,
    blockHeight: result.blockHeight ?? undefined,
    blockTime: result.blockTime ? new Date(result.blockTime * 1000) : undefined,
    blockHash: result.blockhash,
  };
}

const resultJsonDecoder = jsonDecoderObjectToObject({
  parentSlot: jsonCodecBlockSlot.decoder,
  blockHeight: jsonDecoderNullable(jsonCodecNumber.decoder),
  blockTime: jsonDecoderNullable(jsonCodecNumber.decoder),
  blockhash: jsonCodecBlockHash.decoder,
});
