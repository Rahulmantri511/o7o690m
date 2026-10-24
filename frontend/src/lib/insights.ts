import type { Accuracy } from "@/api/types";
import { formatGW, formatPercent } from "./format";

export interface Insight {
  headline: string;
  detail: string;
  tone: "neutral" | "warning";
}

/** Plain-English reading of the accuracy numbers for the trading desk. */
export function buildInsight(accuracy: Accuracy): Insight | null {
  const s = accuracy.summary;
  if (!s) return null;
  const p90 = accuracy.buffers.find((b) => b.coverage === 0.9);
  const leaning = s.bias > 0 ? "over-predicted" : "under-predicted";
  const share = s.bias > 0 ? s.over_forecast_share : 1 - s.over_forecast_share;
  const material = Math.abs(s.bias) >= 0.25 * s.mae;

  const headline = material
    ? `The forecast ${leaning} wind in ${formatPercent(share)} of hours, by ${formatGW(Math.abs(s.bias))} GW on average.`
    : `The forecast was broadly unbiased, with a typical miss of ${formatGW(s.mae)} GW.`;

  const detail =
    s.bias > 0 && material
      ? `Buying against the raw forecast would have left the desk short of power most hours.` +
        (p90 ? ` Reducing planned wind by ${formatGW(p90.derate_mw)} GW would have covered 9 in 10 hours.` : "")
      : `Typical absolute error is ${formatPercent(s.nmae)} of mean wind output; size reserves against the P90 error of ${formatGW(s.p90_abs)} GW.`;

  return { headline, detail, tone: s.bias > 0 && material ? "warning" : "neutral" };
}
