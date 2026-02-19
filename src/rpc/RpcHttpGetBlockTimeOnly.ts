import { BlockSlot, blockSlotToNumber } from "../data/Block";
import { jsonCodecNumber, jsonDecoderNullable } from "../data/Json";
import { RpcHttp } from "./RpcHttp";

/** Fetches only the timestamp for a block by slot. */

export async function rpcHttpGetBlockTimeOnly(
  self: RpcHttp,
  blockSlot: BlockSlot,
): Promise<{ blockTime: Date | undefined }> {
  const result = resultJsonDecoder(
    await self("getBlockTime", [blockSlotToNumber(blockSlot)], undefined),
  );
  return { blockTime: result ? new Date(result * 1000) : undefined };
}

const resultJsonDecoder = jsonDecoderNullable(jsonCodecNumber.decoder);
