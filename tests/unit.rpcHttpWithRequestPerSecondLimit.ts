import { it } from "@jest/globals";
import { JsonValue, RpcHttp, rpcHttpWithRequestsPerSecondLimit } from "../src";

async function rpcHttp(): Promise<JsonValue> {
  return null;
}

async function expectScenarioDurationMs(context: {
  rpcHttp: RpcHttp;
  requestsCount: number;
  expectedMinDurationMs: number;
  expectedMaxDurationMs: number;
}) {
  const startTimeMs = Date.now();
  const promises = [];
  for (let i = 0; i < context.requestsCount; i++) {
    promises.push(context.rpcHttp("method", [], {}));
  }
  await Promise.all(promises);
  const durationMs = Date.now() - startTimeMs;
  expect(durationMs).toBeGreaterThanOrEqual(context.expectedMinDurationMs);
  expect(durationMs).toBeLessThanOrEqual(context.expectedMaxDurationMs);
}

it("run", async () => {
  const promises = [];
  promises.push(
    expectScenarioDurationMs({
      rpcHttp: rpcHttpWithRequestsPerSecondLimit(rpcHttp, 3),
      requestsCount: 2,
      expectedMinDurationMs: 0,
      expectedMaxDurationMs: 100,
    }),
  );
  promises.push(
    expectScenarioDurationMs({
      rpcHttp: rpcHttpWithRequestsPerSecondLimit(rpcHttp, 3),
      requestsCount: 5,
      expectedMinDurationMs: 1000,
      expectedMaxDurationMs: 1100,
    }),
  );
  promises.push(
    expectScenarioDurationMs({
      rpcHttp: rpcHttpWithRequestsPerSecondLimit(rpcHttp, 3),
      requestsCount: 7,
      expectedMinDurationMs: 2000,
      expectedMaxDurationMs: 2100,
    }),
  );
  promises.push(
    expectScenarioDurationMs({
      rpcHttp: rpcHttpWithRequestsPerSecondLimit(rpcHttp, 3),
      requestsCount: 10,
      expectedMinDurationMs: 3000,
      expectedMaxDurationMs: 3100,
    }),
  );
  await Promise.all(promises);
  console.log(
    "Tested rpcHttpWithRequestsPerSecondLimit with 2, 5, 7 and 10 requests",
  );
});
