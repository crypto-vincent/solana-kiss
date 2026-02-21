import { it } from "@jest/globals";
import {
  JsonArray,
  RpcHttp,
  rpcHttpWithConcurrentRequestsLimit as rpcHttpWithConcurrentRequestLimit,
} from "../src";

async function rpcHttp(method: string, params: Readonly<JsonArray>) {
  if (method === "delayMs") {
    await mockClockDelayMs(params[0] as number);
    return params[0]!;
  }
  throw new Error(`Unknown method: ${method}`);
}

async function expectScenarioDurationMs(context: {
  rpcHttp: RpcHttp;
  requestsDurationsMs: Array<number>;
  expectedDurationMs: number;
}) {
  const startTimeMs = mockClockNowMs;
  await Promise.all(
    context.requestsDurationsMs.map((delayMs) =>
      context.rpcHttp("delayMs", [delayMs], {}),
    ),
  );
  expect(mockClockNowMs - startTimeMs).toStrictEqual(
    context.expectedDurationMs,
  );
}

it("run", async () => {
  await expectScenarioDurationMs({
    rpcHttp: rpcHttpWithConcurrentRequestLimit(rpcHttp, 2),
    requestsDurationsMs: [1, 5, 10, 5],
    expectedDurationMs: 11,
  });
  await expectScenarioDurationMs({
    rpcHttp: rpcHttpWithConcurrentRequestLimit(rpcHttp, 2),
    requestsDurationsMs: [5, 5, 10, 10],
    expectedDurationMs: 15,
  });
  await expectScenarioDurationMs({
    rpcHttp: rpcHttpWithConcurrentRequestLimit(rpcHttp, 2),
    requestsDurationsMs: [10, 4, 4, 4],
    expectedDurationMs: 12,
  });
  await expectScenarioDurationMs({
    rpcHttp: rpcHttpWithConcurrentRequestLimit(rpcHttp, 2),
    requestsDurationsMs: [10, 10, 10, 10, 10, 10],
    expectedDurationMs: 30,
  });
  await expectScenarioDurationMs({
    rpcHttp: rpcHttpWithConcurrentRequestLimit(rpcHttp, 4),
    requestsDurationsMs: [10, 10, 10, 10, 10, 10],
    expectedDurationMs: 20,
  });
  await expectScenarioDurationMs({
    rpcHttp: rpcHttpWithConcurrentRequestLimit(rpcHttp, 6),
    requestsDurationsMs: [10, 10, 10, 10, 10, 10],
    expectedDurationMs: 10,
  });
  await expectScenarioDurationMs({
    rpcHttp: rpcHttpWithConcurrentRequestLimit(rpcHttp, 10),
    requestsDurationsMs: [10, 10, 10, 10, 10, 10],
    expectedDurationMs: 10,
  });
});

let mockClockNowMs = 0;
let mockClockTicking = false;
const mockClockTimeouts = new Array<{
  finishTimeMs: number;
  callback: () => void;
}>();

async function mockClockDelayMs(delayMs: number): Promise<void> {
  if (!mockClockTicking) {
    mockClockTicking = true;
    setTimeout(mockClockTick, 0);
  }
  return new Promise((resolve) => {
    mockClockTimeouts.push({
      finishTimeMs: mockClockNowMs + delayMs,
      callback: resolve,
    });
  });
}

function mockClockTick() {
  for (let index = 0; index < mockClockTimeouts.length; ) {
    const mockTimeout = mockClockTimeouts[index]!;
    if (mockTimeout.finishTimeMs <= mockClockNowMs) {
      mockClockTimeouts.splice(index, 1);
      mockTimeout.callback();
    } else {
      index++;
    }
  }
  setTimeout(() => {
    if (mockClockTimeouts.length === 0) {
      mockClockTicking = false;
      return;
    }
    mockClockNowMs++;
    mockClockTick();
  }, 0);
}
