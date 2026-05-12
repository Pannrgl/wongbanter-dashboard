import type { MouseEvent } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import styles from "../styles/navbar.module.css";

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const onLanding = location.pathname === "/";

  const goToSection = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const doScroll = () => {
      const el = document.getElementById(id);
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.scrollY - 86;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    };
    if (onLanding) {
      doScroll();
      return;
    }
    navigate("/");
    window.setTimeout(doScroll, 0);
  };

  return (
    <header className={styles.nav}>
      <div className={styles.inner}>
        <NavLink to="/" className={styles.brand} aria-label="WongBanter Capital">
          <span className={styles.mark}>WB</span>
          <span className={styles.brandText}>
            <span className={styles.title}>WongBanter Capital</span>
            <span className={styles.sub}>Institutional trading capital</span>
          </span>
        </NavLink>

        <nav className={styles.links} aria-label="Primary">
          <a className={styles.link} href="/#performance" onClick={goToSection("performance")}>
            Performance
          </a>
          <a className={styles.link} href="/#signals" onClick={goToSection("signals")}>
            Signals
          </a>
          <a className={styles.link} href="/#trust" onClick={goToSection("trust")}>
            Trust
          </a>
          <a className={styles.link} href="/#community" onClick={goToSection("community")}>
            Community
          </a>
        </nav>

        <div className={styles.cta}>
          <a className={styles.ghost} href="https://mt5.wongbantercapital.com/">
            Live Portfolio
          </a>
          <NavLink to="/register" className={({ isActive }) => (isActive ? styles.primaryActive : styles.primary)}>
            Get Free Signals
          </NavLink>
        </div>
      </div>
    </header>
  );
}
