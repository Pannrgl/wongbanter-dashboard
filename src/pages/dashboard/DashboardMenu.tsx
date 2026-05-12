import { useEffect, useMemo, useState } from "react";

import { Seo } from "../../components/common/Seo";
import { setMenuPref } from "../../components/dashboard/DashboardSidebar";
import styles from "../../styles/dashboard.module.css";

type Key = "home" | "telegram" | "tracker" | "menu";

const MENU_KEY = "wbc.dashboard.menu";

function loadPref(): Key[] | null {
  try {
    const raw = localStorage.getItem(MENU_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const allowed = new Set(["home", "telegram", "tracker", "menu"]);
    const items = parsed.filter((x) => typeof x === "string" && allowed.has(x)) as Key[];
    return items.length ? items : null;
  } catch {
    return null;
  }
}

export function DashboardMenu() {
  const defaultKeys: Key[] = useMemo(() => ["home", "telegram", "tracker", "menu"], []);
  const [keys, setKeys] = useState<Key[]>(() => loadPref() ?? defaultKeys);

  useEffect(() => {
    setMenuPref(keys);
  }, [keys]);

  const toggle = (k: Key) => {
    setKeys((cur) => {
      if (cur.includes(k)) return cur.filter((x) => x !== k);
      return [...cur, k];
    });
  };

  const reset = () => setKeys(defaultKeys);

  return (
    <>
      <Seo title="Menu Management — WongBanter Dashboard" description="Atur menu sidebar." />

      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Menu Management</div>
          <div className={styles.pageSub}>Atur menu yang tampil di sidebar.</div>
        </div>
        <button className={`${styles.btn} ${styles.btnGhost}`} type="button" onClick={reset}>
          Reset
        </button>
      </div>

      <div className={styles.contentGrid}>
        <div className={`${styles.card} ${styles.span12}`}>
          <div className={styles.k}>Visible menus</div>
          <div className={styles.msg}>Perubahan tersimpan otomatis di browser dan akan langsung mempengaruhi sidebar.</div>

          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {(
              [
                ["home", "Overview"],
                ["telegram", "Telegram Integration"],
                ["tracker", "Trading Tracker"],
                ["menu", "Menu Management"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => toggle(k)}
                className={`${styles.btn} ${styles.btnGhost}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>{label}</span>
                <span className={styles.pill}>{keys.includes(k) ? "On" : "Off"}</span>
              </button>
            ))}
          </div>

          <div className={styles.msg} style={{ marginTop: 12 }}>
            Minimal menu yang disarankan: Overview + Trading Tracker.
          </div>
        </div>
      </div>
    </>
  );
}

