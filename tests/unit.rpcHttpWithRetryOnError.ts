import { expect, it } from "@jest/globals";
import { JsonValue, rpcHttpWithRetryOnError } from "../src";

async function failRpcHttp(): Promise<JsonValue> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  throw new Error("Dummy RpcHttp always fails after 100ms");
}

it("run", async () => {
  const rpcHttpWithRetry = rpcHttpWithRetryOnError(
    failRpcHttp,
    async (context) => {
      if (context.retriedCounter >= 3) {
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
      return true;
    },
  );

  const startTimeMs = Date.now();
  let caughtError: any = null;
  try {
    await rpcHttpWithRetry("", [], {});
  } catch (error) {
    caughtError = error;
  }
  const endTimeMs = Date.now();
  const durationMs = endTimeMs - startTimeMs;

  expect(caughtError.message).toStrictEqual(
    "Dummy RpcHttp always fails after 100ms",
  );
  expect(durationMs >= 550).toStrictEqual(true);
  expect(durationMs < 600).toStrictEqual(true);
});
