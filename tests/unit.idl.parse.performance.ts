import { it } from "@jest/globals";
import { idlProgramParse } from "../src";

const iterationCount = 100;

it("run", async () => {
  const benchDurationMs = timeIt(() => {
    const dummy: Record<string, number> = {};
    let sum = 0;
    for (let i = 0; i < 500_000; i++) {
      dummy[i.toString()] = i;
    }
    for (let i = 0; i < 500_000; i++) {
      sum += dummy[i.toString()]!;
    }
  });

  const durationsMs = new Array<number>();
  for (let i = 0; i < iterationCount; i++) {
    durationsMs.push(
      timeIt(() => {
        idlProgramParse(require("./fixtures/idl_anchor_26.json"));
      }),
    );
  }
  durationsMs.sort((a, b) => a - b);

  expect(getPercentile(0.75, durationsMs)).toBeLessThanOrEqual(benchDurationMs);
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
