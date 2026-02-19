import { BlockSlot, blockSlotToNumber } from "../data/Block";
import { jsonCodecNumber, jsonDecoderNullable } from "../data/Json";
import { RpcHttp } from "./RpcHttp";

/**
 * Fetches only the production timestamp for the given block slot.
 *
 * @param self - The {@link RpcHttp} client to use.
 * @param blockSlot - The slot number of the block to query.
 * @returns An object containing `blockTime`, the block production time as a `Date`, or `undefined` if not available.
 */
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
