import { expect, it } from "@jest/globals";
import { JsonValue, rpcHttpWithRetryOnError } from "../src";

let countRpcHttpCalls = 0;
let countRetryDecisions = 0;

async function rpcHttp(): Promise<JsonValue> {
  countRpcHttpCalls++;
  throw new Error("Dummy RpcHttp always fails");
}

it("run", async () => {
  const rpcHttpWithRetry = rpcHttpWithRetryOnError(rpcHttp, async (context) => {
    countRetryDecisions++;
    expect(context.lastError.message).toStrictEqual(
      "Dummy RpcHttp always fails",
    );
    if (context.retriedCounter >= 3) {
      return false;
    }
    return true;
  });
  let caughtError: any = null;
  try {
    await rpcHttpWithRetry("", [], {});
  } catch (error) {
    caughtError = error;
  }
  expect(countRpcHttpCalls).toStrictEqual(4);
  expect(countRetryDecisions).toStrictEqual(4);
  expect(caughtError.message).toStrictEqual("Dummy RpcHttp always fails");
});
