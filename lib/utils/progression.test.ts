import { describe, it, expect } from "vitest";
import { recommendProgression } from "./progression";

describe("recommendProgression", () => {
  it("returns null without prior data", () => {
    expect(
      recommendProgression({
        lastWeight: null,
        lastReps: null,
        lastRpe: null,
        targetReps: 8,
      }),
    ).toBeNull();
  });

  it("increases when the last set felt easy", () => {
    const r = recommendProgression({
      lastWeight: 100,
      lastReps: 8,
      lastRpe: 6,
      targetReps: 8,
    })!;
    expect(r.action).toBe("increase");
    expect(r.suggestedWeightKg).toBe(102.5);
    expect(r.deltaKg).toBe(2.5);
    expect(r.reasonKey).toBe("increaseEasy");
  });

  it("increases when all reps were hit with no RPE logged", () => {
    const r = recommendProgression({
      lastWeight: 100,
      lastReps: 8,
      lastRpe: null,
      targetReps: 8,
    })!;
    expect(r.action).toBe("increase");
    expect(r.reasonKey).toBe("increaseHit");
  });

  it("holds when reps fell slightly short at a tough RPE", () => {
    const r = recommendProgression({
      lastWeight: 100,
      lastReps: 7,
      lastRpe: 8,
      targetReps: 8,
    })!;
    expect(r.action).toBe("hold");
    expect(r.suggestedWeightKg).toBe(100);
    expect(r.deltaKg).toBe(0);
  });

  it("deloads after a maximal (RPE >= 9) session", () => {
    const r = recommendProgression({
      lastWeight: 100,
      lastReps: 5,
      lastRpe: 9,
      targetReps: 5,
    })!;
    expect(r.action).toBe("deload");
    expect(r.suggestedWeightKg).toBe(90);
    expect(r.deltaKg).toBe(-10);
    expect(r.reasonKey).toBe("deloadHard");
  });

  it("deloads when reps collapsed well below target", () => {
    const r = recommendProgression({
      lastWeight: 100,
      lastReps: 3,
      lastRpe: 7,
      targetReps: 8,
    })!;
    expect(r.action).toBe("deload");
    expect(r.reasonKey).toBe("deloadMissed");
  });

  it("respects a custom increment", () => {
    const r = recommendProgression({
      lastWeight: 60,
      lastReps: 10,
      lastRpe: 6,
      targetReps: 10,
      incrementKg: 5,
    })!;
    expect(r.suggestedWeightKg).toBe(65);
    expect(r.deltaKg).toBe(5);
  });
});
