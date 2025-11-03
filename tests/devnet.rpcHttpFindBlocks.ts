import {
  blockSlotFromNumber,
  rpcHttpFindBlocks,
  rpcHttpFromUrl,
  urlPublicRpcDevnet,
} from "../src";

const highBlockSlot = blockSlotFromNumber(378967387);
const lowBlockSlot = blockSlotFromNumber(378967287);
const blockDistance = 100;

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl(urlPublicRpcDevnet);

  const { blocksSlots: blocksSlotsFromHigh } = await rpcHttpFindBlocks(
    rpcHttp,
    blockDistance,
    { highBlockSlot },
  );
  expect(blocksSlotsFromHigh.length).toStrictEqual(blockDistance);
  expect(blocksSlotsFromHigh[0]).not.toStrictEqual(highBlockSlot);
  expect(blocksSlotsFromHigh[blocksSlotsFromHigh.length - 1]).toStrictEqual(
    lowBlockSlot,
  );

  const { blocksSlots: blocksSlotsFromLow } = await rpcHttpFindBlocks(
    rpcHttp,
    blockDistance,
    { lowBlockSlot },
  );
  expect(blocksSlotsFromLow.length).toStrictEqual(blockDistance);
  expect(blocksSlotsFromLow[0]).not.toStrictEqual(lowBlockSlot);
  expect(blocksSlotsFromLow[blocksSlotsFromLow.length - 1]).toStrictEqual(
    highBlockSlot,
  );

  const { blocksSlots: blocksSlotsFromHighToLow } = await rpcHttpFindBlocks(
    rpcHttp,
    blockDistance,
    { startBlockSlot: highBlockSlot, endBlockSlot: lowBlockSlot },
  );
  expect(blocksSlotsFromHighToLow).toStrictEqual(blocksSlotsFromHigh);

  const { blocksSlots: blocksSlotsFromLowToHigh } = await rpcHttpFindBlocks(
    rpcHttp,
    blockDistance,
    { startBlockSlot: lowBlockSlot, endBlockSlot: highBlockSlot },
  );
  expect(blocksSlotsFromLowToHigh).toStrictEqual(blocksSlotsFromLow);
});
