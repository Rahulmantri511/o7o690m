import type { BufferLevel } from "@/api/types";
import { formatGW, formatPercent } from "@/lib/format";
import styles from "./AccuracyPage.module.css";

/** Turns the error distribution into a purchasing rule: plan wind = forecast − buffer. */
export function BufferTable({ buffers, meanActual }: { buffers: BufferLevel[]; meanActual: number }) {
  return (
    <table className={styles.bufferTable}>
      <caption className="visually-hidden">Wind buffer needed to cover a given share of hours</caption>
      <thead>
        <tr>
          <th scope="col">Cover</th>
          <th scope="col">Plan wind as</th>
          <th scope="col">Share of avg output</th>
        </tr>
      </thead>
      <tbody>
        {buffers.map((b) => (
          <tr key={b.coverage}>
            <th scope="row">
              <span className={styles.coverage}>{formatPercent(b.coverage)}</span>
              <span className={styles.coverageNote}>of hours</span>
            </th>
            <td>
              forecast {b.derate_mw >= 0 ? "−" : "+"} <strong>{formatGW(Math.abs(b.derate_mw))} GW</strong>
            </td>
            <td>
              <div className={styles.meterCell}>
                <span className={styles.meter} aria-hidden>
                  <span style={{ width: `${Math.min(100, Math.max(0, (b.derate_mw / meanActual) * 100))}%` }} />
                </span>
                <span className="num">{formatPercent(b.derate_mw / meanActual)}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
