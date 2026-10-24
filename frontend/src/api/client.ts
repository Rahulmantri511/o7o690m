import type { Accuracy, DayView, Meta, Selection } from "./types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(detail || `Request failed (${response.status})`, response.status);
  }
  return (await response.json()) as T;
}

export function selectionParams(selection: Selection): string {
  const params = new URLSearchParams({ mode: selection.mode });
  if (selection.mode === "cutoff") params.set("cutoff", selection.cutoff);
  else params.set("horizon", String(selection.horizon));
  return params.toString();
}

export const api = {
  meta: (signal?: AbortSignal) => getJson<Meta>("/api/meta", signal),
  day: (day: string, selection: Selection, signal?: AbortSignal) =>
    getJson<DayView>(`/api/days/${day}?${selectionParams(selection)}`, signal),
  accuracy: (selection: Selection, signal?: AbortSignal) =>
    getJson<Accuracy>(`/api/accuracy?${selectionParams(selection)}`, signal),
};
