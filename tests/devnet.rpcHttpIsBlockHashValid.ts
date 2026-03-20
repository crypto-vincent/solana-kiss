import { it } from "@jest/globals";
import {
  BlockHash,
  blockHashDefault,
  blockHashFromBytes,
  RpcHttp,
  rpcHttpFromUrl,
  rpcHttpGetLatestBlockHash,
  rpcHttpIsBlockHashValid,
  timeoutMs,
  urlRpcPublicDevnet,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl(urlRpcPublicDevnet);

  const { blockHash: latestBlockHash1 } =
    await rpcHttpGetLatestBlockHash(rpcHttp);

  await timeoutMs(2000);

  const { blockHash: latestBlockHash2 } =
    await rpcHttpGetLatestBlockHash(rpcHttp);

  expectBlockHashValidity(rpcHttp, latestBlockHash1, true);
  expectBlockHashValidity(rpcHttp, latestBlockHash2, true);

  const blockHashDummy = blockHashFromBytes(new Uint8Array(32).fill(42));

  expectBlockHashValidity(rpcHttp, blockHashDummy, false);
  expectBlockHashValidity(rpcHttp, blockHashDefault, false);
});

async function expectBlockHashValidity(
  rpcHttp: RpcHttp,
  blockHash: BlockHash,
  validity: boolean,
) {
  expect(await rpcHttpIsBlockHashValid(rpcHttp, blockHash)).toStrictEqual(
    validity,
  );
}
