import { DEFAULT_SELECTION, parseSelection } from "./useSelection";

describe("parseSelection", () => {
  it("defaults to the 11:00 D-1 cut-off", () => {
    expect(parseSelection(new URLSearchParams())).toEqual(DEFAULT_SELECTION);
  });

  it("reads a valid horizon selection", () => {
    expect(parseSelection(new URLSearchParams("mode=horizon&horizon=6"))).toEqual({
      mode: "horizon",
      cutoff: "11:00",
      horizon: 6,
    });
  });

  it("rejects malformed values instead of sending them to the API", () => {
    expect(parseSelection(new URLSearchParams("mode=bogus&cutoff=25:00&horizon=-3"))).toEqual(DEFAULT_SELECTION);
    expect(parseSelection(new URLSearchParams("horizon=abc")).horizon).toBe(24);
  });
});
