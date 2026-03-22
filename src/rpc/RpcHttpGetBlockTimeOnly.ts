import { BlockSlot, blockSlotToNumber } from "../data/Block";
import { jsonCodecNumber, jsonDecoderNullable } from "../data/Json";
import { RpcHttp } from "./RpcHttp";

/**
 * Fetches only the production timestamp for a block slot.
 * @param self - {@link RpcHttp} client.
 * @param blockSlot - Slot to query.
 * @returns `{ blockTime }` as a `Date`, or `undefined` if unavailable.
 */
export async function rpcHttpGetBlockTimeOnly(
  self: RpcHttp,
  blockSlot: BlockSlot,
): Promise<{ blockTime: Date | undefined }> {
  const result = resultJsonDecoder(
    await self(
      "getBlockTime",
      [blockSlotToNumber(blockSlot)],
      "skip-configuration-object",
    ),
  );
  return { blockTime: result ? new Date(result * 1000) : undefined };
}

const resultJsonDecoder = jsonDecoderNullable(jsonCodecNumber.decoder);
