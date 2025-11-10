import { BlockHash, BlockSlot, blockSlotToNumber } from "../data/Block";
import {
  jsonCodecBlockHash,
  jsonCodecBlockSlot,
  jsonCodecNumber,
  jsonDecoderObject,
  jsonDecoderOptional,
} from "../data/Json";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpGetBlockMetadata(
  self: RpcHttp,
  blockSlot: BlockSlot,
): Promise<{
  previousBlockSlot: BlockSlot;
  blockInfo: {
    height: number | undefined;
    time: Date | undefined;
    hash: BlockHash;
  };
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
    blockInfo: {
      height: result.blockHeight,
      time: result.blockTime ? new Date(result.blockTime * 1000) : undefined,
      hash: result.blockhash,
    },
  };
}

const resultJsonDecoder = jsonDecoderObject({
  parentSlot: jsonCodecBlockSlot.decoder,
  blockHeight: jsonDecoderOptional(jsonCodecNumber.decoder),
  blockTime: jsonDecoderOptional(jsonCodecNumber.decoder),
  blockhash: jsonCodecBlockHash.decoder,
});
