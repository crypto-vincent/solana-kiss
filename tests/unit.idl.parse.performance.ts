import { it } from "@jest/globals";
import { idlProgramParse } from "../src";

const iterationCount = 100;

it("run", async () => {
  const computeDurationsMs = new Array<number>();
  for (let i = 0; i < iterationCount; i++) {
    computeDurationsMs.push(
      timeIt(() => {
        idlProgramParse(require("./fixtures/idl_anchor_26.json"));
      }),
    );
  }
  computeDurationsMs.sort((a, b) => a - b);

  const reasonableDurationMs = timeIt(() => {
    const dummy: Record<string, number> = {};
    let sum = 0;
    for (let i = 0; i < 1_000_000; i++) {
      dummy[i.toString()] = i;
    }
    for (let i = 0; i < 1_000_000; i++) {
      sum += dummy[i.toString()]!;
    }
  });

  expect(getPercentile(0.5, computeDurationsMs)).toBeLessThanOrEqual(
    reasonableDurationMs,
  );
});

function getPercentile(
  percentile: number,
  sortedValues: Array<number>,
): number {
  const index = Math.round(percentile * (sortedValues.length - 1));
  return sortedValues[index]!;
}

function timeIt(fn: () => void): number {
  const startTimeMs = performance.now();
  fn();
  const endTimeMs = performance.now();
  return endTimeMs - startTimeMs;
}
