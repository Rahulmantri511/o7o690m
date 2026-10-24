import { Outlet } from "react-router-dom";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { SelectionBar } from "./SelectionBar";
import { TickerStrip } from "./TickerStrip";
import styles from "./AppShell.module.css";

export function AppShell() {
  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>
      <Header />
      <TickerStrip />
      <SelectionBar />
      <main id="main" className={styles.main}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
