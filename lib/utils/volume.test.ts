import { describe, it, expect } from "vitest";
import { setVolume, totalVolume, plannedVolume, formatVolume } from "./volume";

describe("setVolume", () => {
  it("multiplies reps by weight", () => {
    expect(setVolume(10, 50)).toBe(500);
  });
  it("returns 0 for null inputs", () => {
    expect(setVolume(null, 50)).toBe(0);
    expect(setVolume(10, null)).toBe(0);
  });
});

describe("totalVolume", () => {
  it("sums only completed sets", () => {
    const logs = [
      { actual_reps: 10, actual_weight: 50, completed: true },
      { actual_reps: 8, actual_weight: 60, completed: false },
      { actual_reps: 5, actual_weight: 100, completed: true },
    ];
    expect(totalVolume(logs)).toBe(500 + 500);
  });
  it("returns 0 for empty list", () => {
    expect(totalVolume([])).toBe(0);
  });
});

describe("plannedVolume", () => {
  it("multiplies sets, reps, and weight", () => {
    expect(
      plannedVolume([{ target_sets: 3, target_reps: 10, target_weight: 50 }]),
    ).toBe(1500);
  });
});

describe("formatVolume", () => {
  it("rounds small values", () => expect(formatVolume(499.6)).toBe("500"));
  it("compacts thousands", () => expect(formatVolume(2500)).toBe("2.5k"));
});
