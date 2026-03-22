import {
  BlockSlot,
  blockSlotFromNumber,
  blockSlotToNumber,
} from "../data/Block";
import { jsonCodecNumber, jsonDecoderArrayToArray } from "../data/Json";
import { RpcHttp } from "./RpcHttp";

/**
 * Fetches confirmed block slots in a range. Auto-paginates.
 * `context` defines direction: `{ lowBlockSlot }`, `{ highBlockSlot }`, or `{ startBlockSlot, endBlockSlot }`.
 * @param self - {@link RpcHttp} client.
 * @param maxResultLength - Max slots to return.
 * @param context - Range/direction definition.
 * @returns `{ blocksSlots }`.
 */
export async function rpcHttpFindBlocks(
  self: RpcHttp,
  maxResultLength: number,
  context:
    | { highBlockSlot: BlockSlot }
    | { lowBlockSlot: BlockSlot }
    | { startBlockSlot: BlockSlot; endBlockSlot: BlockSlot },
): Promise<{ blocksSlots: Array<BlockSlot> }> {
  let orderDescending: boolean;
  let lowBlockSlot: number;
  let highBlockSlot: number;
  if ("lowBlockSlot" in context) {
    orderDescending = false;
    lowBlockSlot = blockSlotToNumber(context.lowBlockSlot);
    highBlockSlot = +Infinity;
  } else if ("highBlockSlot" in context) {
    orderDescending = true;
    lowBlockSlot = 0;
    highBlockSlot = blockSlotToNumber(context.highBlockSlot);
  } else {
    const startBlockSlot = blockSlotToNumber(context.startBlockSlot);
    const endBlockSlot = blockSlotToNumber(context.endBlockSlot);
    if (startBlockSlot <= endBlockSlot) {
      orderDescending = false;
      lowBlockSlot = startBlockSlot;
      highBlockSlot = endBlockSlot;
    } else {
      orderDescending = true;
      lowBlockSlot = endBlockSlot;
      highBlockSlot = startBlockSlot;
    }
  }
  const searchDistance = Math.min(500_000, maxResultLength * 2);
  const blocksSlots = new Array<BlockSlot>();
  if (orderDescending) {
    while (true) {
      const result = resultJsonDecoder(
        await self(
          "getBlocks",
          [highBlockSlot - searchDistance, highBlockSlot - 1],
          {},
        ),
      );
      if (result.length === 0) {
        return { blocksSlots };
      }
      result.reverse();
      for (const blockSlot of result) {
        if (blockSlot < highBlockSlot) {
          highBlockSlot = blockSlot;
        }
        blocksSlots.push(blockSlotFromNumber(blockSlot));
        if (
          blockSlot === lowBlockSlot ||
          blocksSlots.length >= maxResultLength
        ) {
          return { blocksSlots };
        }
      }
    }
  }
  while (true) {
    const result = resultJsonDecoder(
      await self(
        "getBlocks",
        [lowBlockSlot + 1, lowBlockSlot + searchDistance],
        {},
      ),
    );
    if (result.length === 0) {
      return { blocksSlots };
    }
    for (const blockSlot of result) {
      if (blockSlot > lowBlockSlot) {
        lowBlockSlot = blockSlot;
      }
      blocksSlots.push(blockSlotFromNumber(blockSlot));
      if (
        blockSlot === highBlockSlot ||
        blocksSlots.length >= maxResultLength
      ) {
        return { blocksSlots };
      }
    }
  }
}

const resultJsonDecoder = jsonDecoderArrayToArray(jsonCodecNumber.decoder);
