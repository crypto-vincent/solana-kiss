import { BlockSlot, blockSlotToNumber } from "../data/Block";
import { jsonCodecNumber, jsonDecoderOptional } from "../data/Json";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpGetBlockTimeOnly(
  self: RpcHttp,
  blockSlot: BlockSlot,
): Promise<{ blockTime: Date | undefined }> {
  const result = resultJsonDecoder(
    await self("getBlockTime", [blockSlotToNumber(blockSlot)], undefined),
  );
  return { blockTime: result ? new Date(result * 1000) : undefined };
}

const resultJsonDecoder = jsonDecoderOptional(jsonCodecNumber.decoder);
