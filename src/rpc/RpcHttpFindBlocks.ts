import {
  BlockSlot,
  blockSlotFromNumber,
  blockSlotToNumber,
} from "../data/Block";
import { jsonCodecNumber, jsonDecoderArray } from "../data/Json";
import { RpcHttp } from "./RpcHttp";

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
      await self("getBlocks", [lowBlockSlot + 1, lowBlockSlot + batchSize], {}),
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

const resultJsonDecoder = jsonDecoderArray(jsonCodecNumber.decoder);
