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
          <a className={styles.link} href="/#features" onClick={goToSection("features")}>
            Features
          </a>
          <a className={styles.link} href="/#stats" onClick={goToSection("stats")}>
            Stats
          </a>
          <a className={styles.link} href="/#testimonials" onClick={goToSection("testimonials")}>
            Testimonials
          </a>
        </nav>

        <div className={styles.cta}>
          <NavLink to="/track" className={({ isActive }) => (isActive ? styles.ghostActive : styles.ghost)}>
            Track My Portfolio
          </NavLink>
          <NavLink to="/register" className={({ isActive }) => (isActive ? styles.primaryActive : styles.primary)}>
            Get Started
          </NavLink>
        </div>
      </div>
    </header>
  );
}
