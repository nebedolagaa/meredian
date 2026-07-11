import { describe, it, expect } from "vitest";
import { computeDelta, formatDelta, deltaPercent } from "./delta";

describe("computeDelta", () => {
  it("flags over-target", () => {
    expect(computeDelta(12, 10)).toEqual({ value: 2, direction: "over" });
  });
  it("flags under-target", () => {
    expect(computeDelta(8, 10)).toEqual({ value: -2, direction: "under" });
  });
  it("flags on-target", () => {
    expect(computeDelta(10, 10)).toEqual({ value: 0, direction: "on-target" });
  });
  it("treats null actual as on-target", () => {
    expect(computeDelta(null, 10)).toEqual({
      value: 0,
      direction: "on-target",
    });
  });
});

describe("formatDelta", () => {
  it("prefixes a plus sign for positive values", () => {
    expect(formatDelta({ value: 5, direction: "over" }, "kg")).toBe("+5kg");
  });
  it("keeps the minus sign for negatives", () => {
    expect(formatDelta({ value: -2, direction: "under" }, " reps")).toBe(
      "-2 reps",
    );
  });
});

describe("deltaPercent", () => {
  it("computes the rounded percentage", () => {
    expect(deltaPercent(110, 100)).toBe(10);
  });
  it("returns 0 when target is 0", () => {
    expect(deltaPercent(50, 0)).toBe(0);
  });
});
