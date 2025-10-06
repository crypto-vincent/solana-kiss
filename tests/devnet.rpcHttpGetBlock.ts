import { it } from "@jest/globals";
import { blockSlotFromNumber, rpcHttpFromUrl } from "../src";
import { rpcHttpGetBlock } from "../src/rpc/RpcHttpGetBlock";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");
  const block = await rpcHttpGetBlock(rpcHttp, blockSlotFromNumber(378967387));
  expect(block.hash).toStrictEqual(
    "2SS9WkNqMdHkY8iki5CvzjeBkbiXSsDE2zY4oZHv7fDM",
  );
  expect(block.height).toStrictEqual(366940433);
  expect(block.time?.toISOString()).toStrictEqual("2025-05-06T02:42:34.000Z");
  expect(block.signatures.length).toStrictEqual(17);
  expect(block.signatures[0]).toStrictEqual(
    "3g4afiLu3KW1G2eYhvP1h3aKx2Pp54CCtqZTRX9q7daY84TQ6RcKMERNk56QJPi5CrhV5dYTHJzSrk6z4aLWKKrd",
  );
});
