/** Number and time formatting. All times are shown in UK local time (the market's clock). */

export const UK_TZ = "Europe/London";

const integer = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

export function formatMW(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return integer.format(Math.round(value));
}

/** "2.11" GW from MW, with fixed decimals so columns of figures line up. */
export function formatGW(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "-";
  return (value / 1000).toFixed(digits);
}

export function formatSigned(text: string, value: number): string {
  if (value > 0) return `+${text}`;
  if (value < 0) return `−${text.replace("-", "")}`;
  return text;
}

export function formatSignedGW(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "-";
  return formatSigned(formatGW(Math.abs(value), digits), value);
}

export function formatSignedMW(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return formatSigned(formatMW(Math.abs(value)), value);
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(digits)}%`;
}

/** Compact axis tick: 12000 -> "12k". */
export function formatAxisMW(value: number): string {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return String(value);
}

function parts(iso: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: UK_TZ, ...options }).format(new Date(iso));
}

/** "14:30" */
export const formatClock = (iso: string) =>
  parts(iso, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** "Wed 14 Jan" */
export const formatShortDate = (iso: string) =>
  parts(iso, { weekday: "short", day: "numeric", month: "short" });

/** "Wed 14 Jan, 09:30" */
export const formatDateTime = (iso: string) => `${formatShortDate(iso)}, ${formatClock(iso)}`;

/** UK calendar day ("YYYY-MM-DD") that contains the given instant. */
export const toUkDay = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: UK_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );

/** Day-of-delivery helpers work on "YYYY-MM-DD" strings, interpreted as UK calendar days. */
const dayDate = (day: string) => new Date(`${day}T12:00:00Z`);

/** "Thursday 15 January 2026" (assembled from parts: ICU versions disagree on the comma). */
export const formatDayLong = (day: string) => {
  const d = dayDate(day);
  const pick = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(d);
  return `${pick({ weekday: "long" })} ${d.getUTCDate()} ${pick({ month: "long" })} ${d.getUTCFullYear()}`;
};

export const formatDayParts = (day: string) => {
  const d = dayDate(day);
  return {
    weekday: new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(d),
    dayOfMonth: d.getUTCDate(),
    month: new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(d),
  };
};

export function formatHours(hours: number): string {
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;
}
