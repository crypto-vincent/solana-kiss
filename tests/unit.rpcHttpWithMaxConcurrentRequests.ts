import { it } from "@jest/globals";
import { JsonArray, RpcHttp, rpcHttpWithMaxConcurrentRequests } from "../src";

async function rpcHttp(method: string, params: JsonArray) {
  if (method === "delayMs") {
    await mockClockDelayMs(params[0] as number);
    return undefined;
  }
  throw new Error(`Unknown method: ${method}`);
}

async function expectParallelDelaysDurationMs(context: {
  rpcHttp: RpcHttp;
  delaysMs: number[];
  expectedDurationMs: number;
}) {
  const startTimeMs = mockClockNowMs;
  await Promise.all(
    context.delaysMs.map((delayMs) =>
      context.rpcHttp("delayMs", [delayMs], {}),
    ),
  );
  expect(mockClockNowMs - startTimeMs).toStrictEqual(
    context.expectedDurationMs,
  );
}

it("run", async () => {
  await expectParallelDelaysDurationMs({
    rpcHttp: rpcHttpWithMaxConcurrentRequests(rpcHttp, 2),
    delaysMs: [10, 50, 100, 50],
    expectedDurationMs: 110,
  });
  await expectParallelDelaysDurationMs({
    rpcHttp: rpcHttpWithMaxConcurrentRequests(rpcHttp, 2),
    delaysMs: [50, 50, 100, 100],
    expectedDurationMs: 150,
  });
  await expectParallelDelaysDurationMs({
    rpcHttp: rpcHttpWithMaxConcurrentRequests(rpcHttp, 2),
    delaysMs: [100, 34, 34, 34],
    expectedDurationMs: 102,
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
  if (mockClockTimeouts.length === 0) {
    mockClockTicking = false;
    return;
  }
  setTimeout(() => {
    mockClockNowMs++;
    mockClockTick();
  }, 0);
}
