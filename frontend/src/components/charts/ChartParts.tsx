import type { ReactNode } from "react";
import styles from "./ChartParts.module.css";

export interface LegendItem {
  label: string;
  color: string;
  kind?: "line" | "band" | "thin" | "square";
}

export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className={styles.legend}>
      {items.map((item) => (
        <li key={item.label}>
          <span
            className={styles[`key_${item.kind ?? "line"}`]}
            style={{ "--key-color": item.color } as React.CSSProperties}
            aria-hidden
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export interface TooltipRow {
  label: string;
  value: ReactNode;
  color?: string;
  emphasis?: boolean;
}

export function TooltipCard({ title, rows, footer }: { title: ReactNode; rows: TooltipRow[]; footer?: ReactNode }) {
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitle}>{title}</p>
      <dl>
        {rows.map((row) => (
          <div key={row.label} className={row.emphasis ? styles.emphasis : undefined}>
            <dt>
              {row.color && (
                <span
                  className={styles.swatch}
                  style={{ background: row.color }}
                  aria-hidden
                />
              )}
              {row.label}
            </dt>
            <dd className="num">{row.value}</dd>
          </div>
        ))}
      </dl>
      {footer && <p className={styles.tooltipFooter}>{footer}</p>}
    </div>
  );
}

/** Bar with a 4px rounded data-end and a square baseline, for positive and negative values. */
export function DataEndBar(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  value?: number | number[];
}) {
  const { x = 0, y = 0, width = 0, height = 0, fill } = props;
  const value = Array.isArray(props.value) ? (props.value[1] ?? 0) - (props.value[0] ?? 0) : props.value ?? 0;
  const top = Math.min(y, y + height);
  const h = Math.abs(height);
  if (h < 0.5 || width <= 0) return null;
  const r = Math.min(4, width / 2, h);
  const right = x + width;
  const bottom = top + h;
  const path =
    value >= 0
      ? `M${x},${bottom} V${top + r} Q${x},${top} ${x + r},${top} H${right - r} Q${right},${top} ${right},${top + r} V${bottom} Z`
      : `M${x},${top} V${bottom - r} Q${x},${bottom} ${x + r},${bottom} H${right - r} Q${right},${bottom} ${right},${bottom - r} V${top} Z`;
  return <path d={path} fill={fill} />;
}
