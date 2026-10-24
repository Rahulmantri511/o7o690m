import clsx from "clsx";
import { useEffect, useRef } from "react";
import type { DailyError } from "@/api/types";
import { formatDayLong, formatDayParts, formatMW } from "@/lib/format";
import styles from "./DayStrip.module.css";

interface DayStripProps {
  days: string[];
  selected: string;
  daily: DailyError[] | undefined;
  onSelect: (day: string) => void;
}

/** Day picker that doubles as a heat strip of daily forecast error (MAE). */
export function DayStrip({ days, selected, daily, onSelect }: DayStripProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const maeByDay = new Map(daily?.map((d) => [d.date, d.mae]));
  const maxMae = Math.max(1, ...(daily?.map((d) => d.mae) ?? [1]));
  const index = days.indexOf(selected);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-day="${selected}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [selected]);

  const step = (delta: number) => {
    const next = days[index + delta];
    if (next) onSelect(next);
  };

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.nav} onClick={() => step(-1)} disabled={index <= 0} aria-label="Previous day">
        ‹
      </button>
      <div
        ref={listRef}
        className={styles.days}
        role="listbox"
        aria-label="Delivery day"
        tabIndex={0}
        aria-activedescendant={`day-${selected}`}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            step(1);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            step(-1);
          }
        }}
      >
        {days.map((day) => {
          const parts = formatDayParts(day);
          const mae = maeByDay.get(day);
          const level = mae == null ? -1 : Math.min(5, Math.floor((mae / maxMae) * 5.999));
          return (
            <div
              key={day}
              id={`day-${day}`}
              data-day={day}
              role="option"
              aria-selected={day === selected}
              aria-label={`${formatDayLong(day)}${mae != null ? `, MAE ${formatMW(mae)} MW` : ""}`}
              className={clsx(styles.day, day === selected && styles.selected, parts.weekday.startsWith("S") && styles.weekend)}
              onClick={() => onSelect(day)}
              title={mae != null ? `MAE ${formatMW(mae)} MW` : undefined}
            >
              <span className={styles.weekday}>{parts.weekday.slice(0, 2)}</span>
              <span className={styles.date}>{parts.dayOfMonth}</span>
              <span className={styles.heat} style={{ background: level < 0 ? "var(--rule)" : `var(--heat-${level})` }} aria-hidden />
            </div>
          );
        })}
      </div>
      <button type="button" className={styles.nav} onClick={() => step(1)} disabled={index >= days.length - 1} aria-label="Next day">
        ›
      </button>
    </div>
  );
}
