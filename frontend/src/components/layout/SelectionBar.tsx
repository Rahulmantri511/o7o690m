import { useEffect, useState } from "react";
import type { SelectionMode } from "@/api/types";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useSelection } from "@/hooks/useSelection";
import styles from "./SelectionBar.module.css";

const CUTOFF_OPTIONS = Array.from({ length: 29 }, (_, i) => {
  const minutes = 6 * 60 + i * 30; // 06:00 .. 20:00
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

const MODE_OPTIONS: { value: SelectionMode; label: string }[] = [
  { value: "cutoff", label: "Day-ahead cut-off" },
  { value: "horizon", label: "Fixed lead time" },
];

/** Global control for *which* forecast counts as "available at decision time". */
export function SelectionBar() {
  const { selection, update } = useSelection();
  // Slider moves locally and commits on release, so we don't refetch on every pixel.
  const [horizonDraft, setHorizonDraft] = useState(selection.horizon);
  useEffect(() => setHorizonDraft(selection.horizon), [selection.horizon]);
  const commitHorizon = () => {
    if (horizonDraft !== selection.horizon) update({ horizon: horizonDraft });
  };

  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        <span className={styles.label}>Forecast used for decisions</span>
        <SegmentedControl
          label="Forecast selection rule"
          size="sm"
          value={selection.mode}
          options={MODE_OPTIONS}
          onChange={(mode) => update({ mode })}
        />

        {selection.mode === "cutoff" ? (
          <label className={styles.field}>
            <span>Latest run published by</span>
            <select
              value={selection.cutoff}
              onChange={(event) => update({ cutoff: event.target.value })}
              className={styles.select}
            >
              {CUTOFF_OPTIONS.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
            <span>UK time on D-1</span>
            {selection.cutoff === "11:00" && (
              <span className={styles.tag} title="GB day-ahead auction gate closure">
                Auction gate
              </span>
            )}
          </label>
        ) : (
          <label className={styles.field}>
            <span>At least</span>
            <input
              type="range"
              min={0}
              max={48}
              step={1}
              value={horizonDraft}
              onChange={(event) => setHorizonDraft(Number(event.target.value))}
              onPointerUp={commitHorizon}
              onKeyUp={commitHorizon}
              onBlur={commitHorizon}
              className={styles.range}
              aria-valuetext={`${horizonDraft} hours before delivery`}
            />
            <output className={styles.output}>{horizonDraft} h</output>
            <span>before each period</span>
          </label>
        )}
      </div>
    </div>
  );
}
