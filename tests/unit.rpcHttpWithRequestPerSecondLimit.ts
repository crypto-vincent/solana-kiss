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
      rpcHttp: rpcHttpWithRequestsPerSecondLimit(rpcHttp, 10),
      requestsCount: 5,
      expectedMinDurationMs: 400,
      expectedMaxDurationMs: 450,
    }),
  );
  promises.push(
    expectScenarioDurationMs({
      rpcHttp: rpcHttpWithRequestsPerSecondLimit(rpcHttp, 10),
      requestsCount: 15,
      expectedMinDurationMs: 1400,
      expectedMaxDurationMs: 1450,
    }),
  );
  promises.push(
    expectScenarioDurationMs({
      rpcHttp: rpcHttpWithRequestsPerSecondLimit(rpcHttp, 10),
      requestsCount: 25,
      expectedMinDurationMs: 2400,
      expectedMaxDurationMs: 2450,
    }),
  );
  await Promise.all(promises);
});
