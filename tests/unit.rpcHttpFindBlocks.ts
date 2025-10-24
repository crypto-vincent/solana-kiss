import { blockSlotFromNumber, rpcHttpFindBlocks } from "../src";

const highBlockSlot = blockSlotFromNumber(9);
const lowBlockSlot = blockSlotFromNumber(3);
const blockDistance = 4;

function rpcHttp() {
  return require("./fixtures/RpcHttpGetBlocks.json");
}

it("run", async () => {
  const { blocksSlots: blocksSlotsFromHigh } = await rpcHttpFindBlocks(
    rpcHttp,
    blockDistance,
    { highBlockSlot },
  );
  expect(blocksSlotsFromHigh).toStrictEqual([9, 7, 5, 3]);

  const { blocksSlots: blocksSlotsFromLow } = await rpcHttpFindBlocks(
    rpcHttp,
    blockDistance,
    { lowBlockSlot },
  );
  expect(blocksSlotsFromLow).toStrictEqual([3, 5, 7, 9]);

  const { blocksSlots: blocksSlotsFromHighToLow } = await rpcHttpFindBlocks(
    rpcHttp,
    blockDistance,
    { startBlockSlot: highBlockSlot, endBlockSlot: lowBlockSlot },
  );
  expect(blocksSlotsFromHighToLow).toStrictEqual([9, 7, 5, 3]);

  const { blocksSlots: blocksSlotsFromLowToHigh } = await rpcHttpFindBlocks(
    rpcHttp,
    blockDistance,
    { startBlockSlot: lowBlockSlot, endBlockSlot: highBlockSlot },
  );
  expect(blocksSlotsFromLowToHigh).toStrictEqual([3, 5, 7, 9]);
});
