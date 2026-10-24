/** Two offset wind traces: forecast (orange) over actual (blue). */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="7" fill="var(--inverse-bg)" />
      <path
        d="M7 20.5c3-4 5.5-4 8.5 0s5.5 4 8.5 0"
        fill="none"
        stroke="var(--series-forecast)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M7 13c3-4 5.5-4 8.5 0s5.5 4 8.5 0"
        fill="none"
        stroke="var(--series-actual)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
