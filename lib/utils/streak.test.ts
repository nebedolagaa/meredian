import { describe, it, expect } from "vitest";
import { computeStreak, weekIndex } from "./streak";

// 2024-01-01 is a Monday, so these are clean Monday-based week boundaries.
const WEEK_A = "2024-01-01"; // Mon .. 2024-01-07 Sun
const WEEK_B = "2024-01-08";
const WEEK_C = "2024-01-15";
const WEEK_D = "2024-01-22";

describe("weekIndex", () => {
  it("keeps Monday..Sunday in the same week", () => {
    expect(weekIndex("2024-01-07")).toBe(weekIndex(WEEK_A)); // Sunday
    expect(weekIndex("2024-01-04")).toBe(weekIndex(WEEK_A)); // Thursday
  });
  it("advances by one across the Monday boundary", () => {
    expect(weekIndex(WEEK_B)).toBe(weekIndex(WEEK_A) + 1);
    expect(weekIndex(WEEK_C)).toBe(weekIndex(WEEK_A) + 2);
  });
});

describe("computeStreak", () => {
  it("returns an empty streak with no data", () => {
    const r = computeStreak([], 2, WEEK_D);
    expect(r).toEqual({
      current: 0,
      longest: 0,
      thisWeekCount: 0,
      goal: 2,
      metThisWeek: false,
    });
  });

  it("counts consecutive goal-meeting weeks including the current one", () => {
    const dates = [WEEK_B, WEEK_B, WEEK_C, WEEK_C, WEEK_D, WEEK_D];
    const r = computeStreak(dates, 2, "2024-01-24"); // within week D
    expect(r.current).toBe(3);
    expect(r.longest).toBe(3);
    expect(r.thisWeekCount).toBe(2);
    expect(r.metThisWeek).toBe(true);
  });

  it("keeps the streak alive during the in-progress week (grace period)", () => {
    const dates = [WEEK_B, WEEK_B, WEEK_C, WEEK_C, WEEK_D]; // week D only 1 so far
    const r = computeStreak(dates, 2, "2024-01-23");
    expect(r.metThisWeek).toBe(false);
    expect(r.thisWeekCount).toBe(1);
    expect(r.current).toBe(2); // weeks B and C still count
  });

  it("breaks the streak when a past week missed the goal", () => {
    const dates = [WEEK_A, WEEK_A, WEEK_B, WEEK_B, WEEK_D, WEEK_D]; // week C skipped
    const r = computeStreak(dates, 2, "2024-01-24");
    expect(r.current).toBe(1); // only week D
    expect(r.longest).toBe(2); // weeks A and B
  });

  it("treats a goal below one as one", () => {
    const r = computeStreak([WEEK_D], 0, WEEK_D);
    expect(r.goal).toBe(1);
    expect(r.current).toBe(1);
  });
});
