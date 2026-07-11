import { describe, it, expect } from "vitest";
import {
  KG_PER_LB,
  toDisplayWeight,
  toKg,
  unitLabel,
  formatVolume,
} from "./units";

describe("toDisplayWeight", () => {
  it("returns kg unchanged", () => {
    expect(toDisplayWeight(100, "kg")).toBe(100);
  });
  it("converts kg to lb rounded to 1 decimal", () => {
    expect(toDisplayWeight(100, "lb")).toBe(220.5);
  });
});

describe("toKg", () => {
  it("returns kg unchanged", () => {
    expect(toKg(100, "kg")).toBe(100);
  });
  it("converts lb to kg rounded to 2 decimals", () => {
    expect(toKg(220.5, "lb")).toBe(100.02);
  });
  it("round-trips approximately", () => {
    const display = toDisplayWeight(60, "lb");
    expect(toKg(display, "lb")).toBeCloseTo(60, 0);
  });
});

describe("unitLabel", () => {
  it("labels kg", () => expect(unitLabel("kg")).toBe("kg"));
  it("labels lb", () => expect(unitLabel("lb")).toBe("lb"));
});

describe("formatVolume", () => {
  it("formats small values as rounded integers", () => {
    expect(formatVolume(950, "kg")).toBe("950");
  });
  it("formats thousands compactly", () => {
    expect(formatVolume(12400, "kg")).toBe("12.4k");
  });
});

describe("constants", () => {
  it("uses the exact kg-per-lb factor", () => {
    expect(KG_PER_LB).toBe(0.45359237);
  });
});
