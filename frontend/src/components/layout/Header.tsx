import clsx from "clsx";
import { NavLink, useLocation } from "react-router-dom";
import { useMeta } from "@/api/queries";
import { useTheme } from "@/hooks/useTheme";
import { formatDateTime } from "@/lib/format";
import { Logo } from "./Logo";
import styles from "./Header.module.css";

const NAV = [
  { to: "/", label: "Decision desk", end: true },
  { to: "/accuracy", label: "Forecast accuracy", end: false },
  { to: "/methodology", label: "Methodology", end: false },
];

export function Header() {
  const { search } = useLocation();
  const { theme, toggle } = useTheme();
  const meta = useMeta();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <NavLink to={{ pathname: "/", search }} className={styles.brand} aria-label="WindScope home">
          <Logo />
          <span className={styles.wordmark}>WindScope</span>
        </NavLink>

        <nav className={styles.nav} aria-label="Primary">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={{ pathname: item.to, search }}
              end={item.end}
              className={({ isActive }) => clsx(styles.link, isActive && styles.active)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.tools}>
          {meta.data && (
            <span
              className={clsx(styles.source, styles[meta.data.source])}
              title={`Data loaded ${formatDateTime(meta.data.fetched_at)} UK time`}
            >
              <span className={styles.dot} aria-hidden />
              {meta.data.source === "live" ? "Live · Elexon BMRS" : "Snapshot · Elexon BMRS"}
            </span>
          )}
          <button
            type="button"
            className={styles.theme}
            onClick={toggle}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </header>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </svg>
  );
}
