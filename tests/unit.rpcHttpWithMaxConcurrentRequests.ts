import { it } from "@jest/globals";
import { JsonValue, RpcHttp, rpcHttpWithMaxConcurrentRequests } from "../src";

async function dummyRpcHttp(method: string, params: Array<JsonValue>) {
  if (method === "delay") {
    const delayMs = Number(params[0]);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return [delayMs];
  }
  throw new Error(`Unknown method: ${method}`);
}

async function expectParallelDelaysDurationMs(context: {
  rpcHttp: RpcHttp;
  delaysMs: number[];
  expectedDurationMs: number;
}) {
  const startTimeMs = Date.now();
  const promises = context.delaysMs.map((delayMs) =>
    context.rpcHttp("delay", [delayMs], {}),
  );
  await Promise.all(promises);
  const endTimeMs = Date.now();
  const durationMs = endTimeMs - startTimeMs;
  expect(durationMs >= context.expectedDurationMs).toStrictEqual(true);
  expect(durationMs < context.expectedDurationMs + 50).toStrictEqual(true);
}

it("run", async () => {
  await expectParallelDelaysDurationMs({
    rpcHttp: rpcHttpWithMaxConcurrentRequests(dummyRpcHttp, 2),
    delaysMs: [1, 50, 100, 50],
    expectedDurationMs: 100,
  });
  await expectParallelDelaysDurationMs({
    rpcHttp: rpcHttpWithMaxConcurrentRequests(dummyRpcHttp, 2),
    delaysMs: [50, 50, 1, 100],
    expectedDurationMs: 150,
  });
  await expectParallelDelaysDurationMs({
    rpcHttp: rpcHttpWithMaxConcurrentRequests(dummyRpcHttp, 2),
    delaysMs: [100, 20, 20, 20, 20, 20],
    expectedDurationMs: 100,
  });
  await expectParallelDelaysDurationMs({
    rpcHttp: rpcHttpWithMaxConcurrentRequests(dummyRpcHttp, 2),
    delaysMs: [100, 100, 100, 100, 100, 100],
    expectedDurationMs: 300,
  });
  await expectParallelDelaysDurationMs({
    rpcHttp: rpcHttpWithMaxConcurrentRequests(dummyRpcHttp, 4),
    delaysMs: [100, 100, 100, 100, 100, 100],
    expectedDurationMs: 200,
  });
  await expectParallelDelaysDurationMs({
    rpcHttp: rpcHttpWithMaxConcurrentRequests(dummyRpcHttp, 6),
    delaysMs: [100, 100, 100, 100, 100, 100],
    expectedDurationMs: 100,
  });
  await expectParallelDelaysDurationMs({
    rpcHttp: rpcHttpWithMaxConcurrentRequests(dummyRpcHttp, 10),
    delaysMs: [100, 100, 100, 100, 100, 100],
    expectedDurationMs: 100,
  });
});
