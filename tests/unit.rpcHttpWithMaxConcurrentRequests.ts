import { it } from "@jest/globals";
import { JsonValue, RpcHttp, rpcHttpWithMaxConcurrentRequests } from "../src";

async function rpcHttp(method: string, params: Array<JsonValue>) {
  if (method === "delayMs") {
    await new Promise((resolve) => setTimeout(resolve, params[0] as number));
    return undefined;
  }
  throw new Error(`Unknown method: ${method}`);
}

async function expectParallelDelaysDurationMs(context: {
  rpcHttp: RpcHttp;
  delaysMs: number[];
  expectedDurationMs: number;
}) {
  const startTimeMs = Date.now();
  await Promise.all(
    context.delaysMs.map((delayMs) =>
      context.rpcHttp("delayMs", [delayMs], {}),
    ),
  );
  const durationMs = Date.now() - startTimeMs;
  expect(durationMs).toBeGreaterThanOrEqual(context.expectedDurationMs);
  expect(durationMs).toBeLessThan(
    context.expectedDurationMs * 1.2 + 20 /* ms jitter */,
  );
}

it("run", async () => {
  await expectParallelDelaysDurationMs({
    rpcHttp: rpcHttpWithMaxConcurrentRequests(rpcHttp, 2),
    delaysMs: [0, 50, 100, 50],
    expectedDurationMs: 100,
  });
  await expectParallelDelaysDurationMs({
    rpcHttp: rpcHttpWithMaxConcurrentRequests(rpcHttp, 2),
    delaysMs: [50, 50, 100, 100],
    expectedDurationMs: 150,
  });
  await expectParallelDelaysDurationMs({
    rpcHttp: rpcHttpWithMaxConcurrentRequests(rpcHttp, 2),
    delaysMs: [100, 33, 33, 33],
    expectedDurationMs: 100,
  });
  await expectParallelDelaysDurationMs({
    rpcHttp: rpcHttpWithMaxConcurrentRequests(rpcHttp, 2),
    delaysMs: [100, 100, 100, 100, 100, 100],
    expectedDurationMs: 300,
  });
  await expectParallelDelaysDurationMs({
    rpcHttp: rpcHttpWithMaxConcurrentRequests(rpcHttp, 4),
    delaysMs: [100, 100, 100, 100, 100, 100],
    expectedDurationMs: 200,
  });
  await expectParallelDelaysDurationMs({
    rpcHttp: rpcHttpWithMaxConcurrentRequests(rpcHttp, 6),
    delaysMs: [100, 100, 100, 100, 100, 100],
    expectedDurationMs: 100,
  });
  await expectParallelDelaysDurationMs({
    rpcHttp: rpcHttpWithMaxConcurrentRequests(rpcHttp, 10),
    delaysMs: [100, 100, 100, 100, 100, 100],
    expectedDurationMs: 100,
  });
});
