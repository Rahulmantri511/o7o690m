import {
  formatAxisMW,
  formatClock,
  formatDayLong,
  formatGW,
  formatMW,
  formatPercent,
  formatSignedGW,
  formatSignedMW,
  toUkDay,
} from "./format";

describe("number formatting", () => {
  it("formats MW with thousands separators and handles missing values", () => {
    expect(formatMW(11580.7)).toBe("11,581");
    expect(formatMW(null)).toBe("-");
  });

  it("formats GW with fixed decimals", () => {
    expect(formatGW(2107)).toBe("2.11");
    expect(formatGW(500, 1)).toBe("0.5");
  });

  it("signs values with a true minus", () => {
    expect(formatSignedGW(1840)).toBe("+1.84");
    expect(formatSignedGW(-1840)).toBe("−1.84");
    expect(formatSignedMW(-250)).toBe("−250");
    expect(formatSignedMW(0)).toBe("0");
  });

  it("formats percentages and compact axis ticks", () => {
    expect(formatPercent(0.843)).toBe("84%");
    expect(formatAxisMW(12000)).toBe("12k");
    expect(formatAxisMW(2500)).toBe("2.5k");
    expect(formatAxisMW(500)).toBe("500");
  });
});

describe("UK time formatting", () => {
  it("renders winter times as GMT", () => {
    expect(formatClock("2026-01-14T09:30:00Z")).toBe("09:30");
  });

  it("renders summer times as BST and assigns them to the UK day", () => {
    expect(formatClock("2026-07-01T23:30:00Z")).toBe("00:30");
    expect(toUkDay("2026-07-01T23:30:00Z")).toBe("2026-07-02");
  });

  it("formats delivery days without timezone drift", () => {
    expect(formatDayLong("2026-01-15")).toBe("Thursday 15 January 2026");
  });
});
