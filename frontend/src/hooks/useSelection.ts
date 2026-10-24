import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Selection, SelectionMode } from "@/api/types";

export const DEFAULT_SELECTION: Selection = { mode: "cutoff", cutoff: "11:00", horizon: 24 };

const CUTOFF_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Parse the forecast-selection rule from the URL, falling back to defaults for bad input. */
export function parseSelection(params: URLSearchParams): Selection {
  const mode: SelectionMode = params.get("mode") === "horizon" ? "horizon" : "cutoff";
  const cutoffParam = params.get("cutoff");
  const horizonParam = Number(params.get("horizon"));
  return {
    mode,
    cutoff:
      cutoffParam && CUTOFF_PATTERN.test(cutoffParam) ? cutoffParam : DEFAULT_SELECTION.cutoff,
    horizon:
      params.has("horizon") && Number.isFinite(horizonParam) && horizonParam >= 0 && horizonParam <= 48
        ? horizonParam
        : DEFAULT_SELECTION.horizon,
  };
}

/**
 * The selection lives in the URL so every view is shareable and survives reloads,
 * and so that switching pages keeps the same rule.
 */
export function useSelection() {
  const [params, setParams] = useSearchParams();
  const selection = useMemo(() => parseSelection(params), [params]);

  const update = useCallback(
    (patch: Partial<Selection>) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          const merged = { ...parseSelection(current), ...patch };
          next.set("mode", merged.mode);
          next.set("cutoff", merged.cutoff);
          next.set("horizon", String(merged.horizon));
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { selection, update };
}
