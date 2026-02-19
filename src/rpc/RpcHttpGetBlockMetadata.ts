import { BlockHash, BlockSlot, blockSlotToNumber } from "../data/Block";
import {
  jsonCodecBlockHash,
  jsonCodecBlockSlot,
  jsonCodecNumber,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
} from "../data/Json";
import { RpcHttp } from "./RpcHttp";

/** Fetches metadata for a block: hash, height, slot, timestamp. */
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
