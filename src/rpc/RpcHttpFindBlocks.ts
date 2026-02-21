import {
  BlockSlot,
  blockSlotFromNumber,
  blockSlotToNumber,
} from "../data/Block";
import { jsonCodecNumber, jsonDecoderArrayToArray } from "../data/Json";
import { RpcHttp } from "./RpcHttp";

/**
 * Fetches a list of confirmed block slots within a given range.
 *
 * The `context` parameter determines the search direction and bounds:
 * - `{ lowBlockSlot }` – searches forward from `lowBlockSlot`.
 * - `{ highBlockSlot }` – searches backward from `highBlockSlot`.
 * - `{ startBlockSlot, endBlockSlot }` – searches between the two slots; direction is inferred from their relative order.
 *
 * Paginates automatically until `maxResultLength` results are collected or the range is exhausted.
 *
 * @param self - The {@link RpcHttp} client to use.
 * @param maxResultLength - Maximum number of block slots to return.
 * @param context - Defines the search range and direction.
 * @returns An object containing `blocksSlots`, an array of block slots in the order they were found.
 */
export async function rpcHttpFindBlocks(
  self: RpcHttp,
  maxResultLength: number,
  context:
    | { highBlockSlot: BlockSlot }
    | { lowBlockSlot: BlockSlot }
    | { startBlockSlot: BlockSlot; endBlockSlot: BlockSlot },
): Promise<{ blocksSlots: Array<BlockSlot> }> {
  let backward: boolean;
  let lowBlockSlot: number;
  let highBlockSlot: number;
  if ("lowBlockSlot" in context) {
    backward = false;
    lowBlockSlot = blockSlotToNumber(context.lowBlockSlot);
    highBlockSlot = +Infinity;
  } else if ("highBlockSlot" in context) {
    backward = true;
    lowBlockSlot = 0;
    highBlockSlot = blockSlotToNumber(context.highBlockSlot);
  } else {
    const startBlockSlot = blockSlotToNumber(context.startBlockSlot);
    const endBlockSlot = blockSlotToNumber(context.endBlockSlot);
    if (startBlockSlot <= endBlockSlot) {
      backward = false;
      lowBlockSlot = startBlockSlot;
      highBlockSlot = endBlockSlot;
    } else {
      backward = true;
      lowBlockSlot = endBlockSlot;
      highBlockSlot = startBlockSlot;
    }
  }
  const batchSize = Math.min(500_000, maxResultLength * 2);
  const blocksSlots = new Array<BlockSlot>();
  if (backward) {
    while (true) {
      const result = resultJsonDecoder(
        await self(
          "getBlocks",
          [highBlockSlot - batchSize, highBlockSlot - 1],
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
        [lowBlockSlot + 1, lowBlockSlot + batchSize],
        undefined,
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
