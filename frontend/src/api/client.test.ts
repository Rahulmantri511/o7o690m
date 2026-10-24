import { api, ApiError, selectionParams } from "./client";

describe("selectionParams", () => {
  it("only sends the parameter relevant to the mode", () => {
    expect(selectionParams({ mode: "cutoff", cutoff: "11:00", horizon: 24 })).toBe("mode=cutoff&cutoff=11%3A00");
    expect(selectionParams({ mode: "horizon", cutoff: "11:00", horizon: 6 })).toBe("mode=horizon&horizon=6");
  });
});

describe("api client", () => {
  afterEach(() => vi.restoreAllMocks());

  it("surfaces the backend's error detail", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: "2025-12-01 is outside the analysis window" }), { status: 404 }),
    );
    const error = await api.day("2025-12-01", { mode: "cutoff", cutoff: "11:00", horizon: 24 }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, message: "2025-12-01 is outside the analysis window" });
  });
});
