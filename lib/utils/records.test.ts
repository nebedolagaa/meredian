import { describe, it, expect } from "vitest";
import { estimateOneRepMax, computePersonalRecords } from "./records";

describe("estimateOneRepMax", () => {
  it("applies the Epley formula", () => {
    // 100 * (1 + 5/30) = 116.666… → 116.7
    expect(estimateOneRepMax(100, 5)).toBe(116.7);
  });
  it("returns 0 for non-positive inputs", () => {
    expect(estimateOneRepMax(0, 5)).toBe(0);
    expect(estimateOneRepMax(100, 0)).toBe(0);
  });
});

describe("computePersonalRecords", () => {
  it("keeps the heaviest weight and best 1RM per exercise", () => {
    const records = computePersonalRecords([
      { name: "Squat", weight: 100, reps: 5 },
      { name: "Squat", weight: 120, reps: 1 },
      { name: "Bench", weight: 80, reps: 8 },
    ]);
    const squat = records.find((r) => r.name === "Squat")!;
    expect(squat.maxWeight).toBe(120);
    expect(squat.repsAtMax).toBe(1);
    // 120x1 → 120*(1+1/30) = 124.0, the best estimated 1RM
    expect(squat.bestOneRepMax).toBe(124);
  });
  it("ignores zero-weight logs", () => {
    expect(computePersonalRecords([{ name: "X", weight: 0, reps: 5 }])).toEqual(
      [],
    );
  });
  it("sorts by best 1RM descending", () => {
    const records = computePersonalRecords([
      { name: "A", weight: 50, reps: 5 },
      { name: "B", weight: 200, reps: 5 },
    ]);
    expect(records[0].name).toBe("B");
  });
});
