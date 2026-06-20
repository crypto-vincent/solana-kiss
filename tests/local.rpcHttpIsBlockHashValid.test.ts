import { expect, it } from "@jest/globals";
import { rpcHttpIsBlockHashValid } from "../src";

function rpcHttp(method: string) {
  if (method === "isBlockhashValid") {
    return require("./fixtures/solana.isBlockhashValid.json");
  }
  throw new Error(`Unexpected method ${method}`);
}

it("run", async () => {
  expect(await rpcHttpIsBlockHashValid(rpcHttp, null as any)).toStrictEqual(
    true,
  );
});
