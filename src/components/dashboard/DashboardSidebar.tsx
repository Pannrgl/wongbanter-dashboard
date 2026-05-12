import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";

import { clearSession, getSession } from "../../lib/session";
import styles from "../../styles/dashboard.module.css";

type MenuItem = {
  key: "home" | "telegram" | "tracker" | "menu";
  to: string;
  label: string;
  icon: (active: boolean) => JSX.Element;
};

function IconHome(active: boolean) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 10.6 12 3l9 7.6V21a1 1 0 0 1-1 1h-5v-6.5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1V22H4a1 1 0 0 1-1-1V10.6Z"
        stroke={active ? "rgba(255,255,255,.92)" : "rgba(255,255,255,.62)"}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconTelegram(active: boolean) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 5.2 3.8 11.9c-.9.35-.86 1.67.06 1.95l4.6 1.4 1.8 5.2c.3.86 1.4.98 1.88.2l2.6-4.1 4.7 3.4c.7.5 1.7.1 1.9-.75L23 6.9c.2-.9-.8-1.6-2-.97Z"
        stroke={active ? "rgba(255,255,255,.92)" : "rgba(255,255,255,.62)"}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconTracker(active: boolean) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14"
        stroke={active ? "rgba(255,255,255,.92)" : "rgba(255,255,255,.62)"}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M6.8 15.2 10 12l2.2 2.2L17.5 9"
        stroke={active ? "rgba(124,92,255,1)" : "rgba(255,255,255,.62)"}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMenu(active: boolean) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 7h12M6 12h12M6 17h12"
        stroke={active ? "rgba(255,255,255,.92)" : "rgba(255,255,255,.62)"}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

const MENU_KEY = "wbc.dashboard.menu";

function getMenuPref(): MenuItem["key"][] | null {
  try {
    const raw = localStorage.getItem(MENU_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const allowed = new Set(["home", "telegram", "tracker", "menu"]);
    const items = parsed.filter((x) => typeof x === "string" && allowed.has(x)) as MenuItem["key"][];
    return items.length ? items : null;
  } catch {
    return null;
  }
}

export function setMenuPref(keys: MenuItem["key"][]) {
  localStorage.setItem(MENU_KEY, JSON.stringify(keys));
}

export function DashboardSidebar() {
  const navigate = useNavigate();
  const session = getSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const items: MenuItem[] = (() => {
    const all: MenuItem[] = [
      { key: "home", to: "/dashboard", label: "Overview", icon: IconHome },
      { key: "telegram", to: "/dashboard/telegram", label: "Telegram", icon: IconTelegram },
      { key: "tracker", to: "/dashboard/tracker", label: "Trading Tracker", icon: IconTracker },
      { key: "menu", to: "/dashboard/menu", label: "Menu Management", icon: IconMenu },
    ];
    const pref = getMenuPref();
    if (!pref) return all;
    const order = new Map(pref.map((k, i) => [k, i]));
    return all
      .filter((it) => order.has(it.key))
      .sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0));
  })();

  const logout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <button className={styles.mobileTop} type="button" onClick={() => setMobileOpen((v) => !v)}>
        <span className={styles.burger} aria-hidden="true" />
        <span className={styles.mobileTitle}>Dashboard</span>
      </button>

      {mobileOpen ? <button className={styles.backdrop} type="button" onClick={() => setMobileOpen(false)} /> : null}

      <aside
        className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ""} ${mobileOpen ? styles.sidebarMobileOpen : ""}`}
        aria-label="Dashboard sidebar"
      >
        <div className={styles.brand}>
          <div className={styles.logo} aria-hidden="true">
            WB
          </div>
          {collapsed ? null : (
            <div className={styles.brandText}>
              <div className={styles.brandTitle}>WBC Dashboard</div>
              <div className={styles.brandSub}>{session?.email || "—"}</div>
            </div>
          )}
        </div>

        <nav className={styles.nav} aria-label="Dashboard">
          {items.map((it) => (
            <NavLink
              key={it.key}
              to={it.to}
              end={it.key === "home"}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ""} ${collapsed ? styles.navItemCollapsed : ""}`
              }
              onClick={() => setMobileOpen(false)}
            >
              {({ isActive }) => (
                <>
                  <span className={styles.icon}>{it.icon(isActive)}</span>
                  {collapsed ? null : <span className={styles.label}>{it.label}</span>}
                  {collapsed ? null : <span className={styles.chev} aria-hidden="true" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sideFooter}>
          <button className={styles.collapseBtn} type="button" onClick={() => setCollapsed((v) => !v)}>
            <span className={styles.collapseIcon} aria-hidden="true" />
            {collapsed ? null : <span>{collapsed ? "Expand" : "Collapse"}</span>}
          </button>

          <button className={styles.logoutBtn} type="button" onClick={logout}>
            <span className={styles.logoutIcon} aria-hidden="true" />
            {collapsed ? null : <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
