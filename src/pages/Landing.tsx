import { useEffect } from "react";
import { Link } from "react-router-dom";

import { Hero } from "../components/Hero";
import { Seo } from "../components/common/Seo";
import styles from "../styles/landing.module.css";

function useRevealOnScroll() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!nodes.length) return;
    const inClass = styles["in"];
    if (!inClass) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (const n of nodes) n.classList.add(inClass);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add(inClass);
          io.unobserve(e.target);
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -90px 0px" }
    );
    for (const n of nodes) io.observe(n);
    return () => io.disconnect();
  }, []);
}

function useCounters() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll("[data-counter]")) as HTMLElement[];
    if (!nodes.length) return;
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = new WeakSet<Element>();

    const animate = (el: HTMLElement) => {
      if (seen.has(el)) return;
      seen.add(el);
      const raw = el.getAttribute("data-counter");
      const target = raw ? Number(raw) : NaN;
      if (!Number.isFinite(target)) return;

      const isInt = Number.isInteger(target);
      const dur = reduced ? 0 : 900;
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = dur <= 0 ? 1 : Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        const v = target * eased;
        el.textContent = isInt ? String(Math.round(v)) : target >= 10 ? v.toFixed(1) : v.toFixed(2);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (reduced) {
      for (const n of nodes) animate(n);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          animate(e.target as HTMLElement);
          io.unobserve(e.target);
        }
      },
      { threshold: 0.35, rootMargin: "0px 0px -80px 0px" }
    );
    for (const n of nodes) io.observe(n);
    return () => io.disconnect();
  }, []);
}

export function Landing() {
  useRevealOnScroll();
  useCounters();

  return (
    <>
      <Seo
        title="WongBanter Capital — Capital Built For Modern Traders"
        description="Capital built for modern traders: institutional execution, risk intelligence, and real-time monitoring to scale with discipline."
      />

      <Hero />

      <section className={styles.section} id="stats">
        <div className={styles.container}>
          <div className={styles.head} data-reveal>
            <h2 className={styles.h2}>Trust, transparency, and performance</h2>
            <p className={styles.p}>
              Angka di bawah adalah contoh presentasi. Ganti dengan data real sesuai operasional kamu.
            </p>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.stat} data-reveal>
              <div className={styles.statTop}>
                <span className={styles.statK}>Funded traders</span>
                <span className={styles.badge}>Growth</span>
              </div>
              <div className={styles.statV}>
                <span data-counter="1482">0</span>
              </div>
              <div className={styles.statSub}>Active capital accounts</div>
            </div>
            <div className={styles.stat} data-reveal>
              <div className={styles.statTop}>
                <span className={styles.statK}>Total payouts</span>
                <span className={styles.badgeOk}>Payout</span>
              </div>
              <div className={styles.statV}>
                <span data-counter="12.8">0</span>
                <span className={styles.unit}>M</span>
              </div>
              <div className={styles.statSub}>USD equivalent</div>
            </div>
            <div className={styles.stat} data-reveal>
              <div className={styles.statTop}>
                <span className={styles.statK}>Execution speed</span>
                <span className={styles.badge}>Infra</span>
              </div>
              <div className={styles.statV}>
                <span data-counter="38">0</span>
                <span className={styles.unit}>ms</span>
              </div>
              <div className={styles.statSub}>Median routing latency</div>
            </div>
            <div className={styles.stat} data-reveal>
              <div className={styles.statTop}>
                <span className={styles.statK}>Uptime</span>
                <span className={styles.badgeGood}>Stable</span>
              </div>
              <div className={styles.statV}>
                <span data-counter="99.99">0</span>
                <span className={styles.unit}>%</span>
              </div>
              <div className={styles.statSub}>Realtime monitoring</div>
            </div>
          </div>

          <div className={styles.trustRow} data-reveal>
            <span className={styles.trustChip}>Risk-first design</span>
            <span className={styles.trustChip}>Institutional workflow</span>
            <span className={styles.trustChip}>Transparent rules</span>
            <span className={styles.trustChip}>Clean trade journal</span>
            <span className={styles.trustChip}>Realtime portfolio tracking</span>
          </div>
        </div>
      </section>

      <section className={styles.section} id="features">
        <div className={styles.container}>
          <div className={styles.head} data-reveal>
            <h2 className={styles.h2}>Edge for serious execution</h2>
            <p className={styles.p}>Infrastructure dan UX yang dibuat untuk konsistensi—bukan hype.</p>
          </div>

          <div className={styles.featureGrid}>
            <div className={styles.card} data-reveal>
              <div className={styles.icon} />
              <h3 className={styles.h3}>Ultra low latency</h3>
              <p className={styles.p2}>Telemetry realtime untuk menjaga fill quality dan konsistensi routing.</p>
            </div>
            <div className={styles.card} data-reveal>
              <div className={styles.icon2} />
              <h3 className={styles.h3}>Smart risk management</h3>
              <p className={styles.p2}>Guardrails yang tegas: disiplin dulu, baru scale.</p>
            </div>
            <div className={styles.card} data-reveal>
              <div className={styles.icon3} />
              <h3 className={styles.h3}>Institutional execution</h3>
              <p className={styles.p2}>Logs yang rapi dan workflow yang bisa diaudit untuk keputusan yang jelas.</p>
            </div>
            <div className={styles.card} data-reveal>
              <div className={styles.icon4} />
              <h3 className={styles.h3}>AI analytics</h3>
              <p className={styles.p2}>Insight untuk consistency, risk profile, dan behavioral signals.</p>
            </div>
            <div className={styles.card} data-reveal>
              <div className={styles.icon5} />
              <h3 className={styles.h3}>Real-time monitoring</h3>
              <p className={styles.p2}>Lihat akun dan posisi berjalan dengan refresh cepat dan tampilan clean.</p>
            </div>
            <div className={styles.card} data-reveal>
              <div className={styles.icon6} />
              <h3 className={styles.h3}>Scaling capital</h3>
              <p className={styles.p2}>Program scaling untuk trader yang stabil—bukan yang hanya “sekali hit”.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} id="testimonials">
        <div className={styles.container}>
          <div className={styles.head} data-reveal>
            <h2 className={styles.h2}>Traders feel the difference</h2>
            <p className={styles.p}>Contoh testimonial untuk demo. Ganti dengan review real saat live.</p>
          </div>
          <div className={styles.testGrid}>
            <div className={styles.test} data-reveal>
              <div className={styles.testTop}>
                <div className={styles.avatar} />
                <div className={styles.testMeta}>
                  <div className={styles.testName}>Rafi A.</div>
                  <div className={styles.testRole}>XAU / FX trader</div>
                </div>
                <div className={styles.stars} aria-label="5 stars">
                  ★★★★★
                </div>
              </div>
              <div className={styles.quote}>
                “Flow evaluasinya rapi. Monitoring + risk rules bikin keputusan jauh lebih disiplin.”
              </div>
            </div>
            <div className={styles.test} data-reveal>
              <div className={styles.testTop}>
                <div className={styles.avatar2} />
                <div className={styles.testMeta}>
                  <div className={styles.testName}>Nadia S.</div>
                  <div className={styles.testRole}>Index trader</div>
                </div>
                <div className={styles.stars} aria-label="5 stars">
                  ★★★★★
                </div>
              </div>
              <div className={styles.quote}>
                “UI-nya premium. Fokus ke data penting, enak buat review journal dan equity curve.”
              </div>
            </div>
            <div className={styles.test} data-reveal>
              <div className={styles.testTop}>
                <div className={styles.avatar3} />
                <div className={styles.testMeta}>
                  <div className={styles.testName}>Kevin T.</div>
                  <div className={styles.testRole}>Systematic trader</div>
                </div>
                <div className={styles.stars} aria-label="5 stars">
                  ★★★★★
                </div>
              </div>
              <div className={styles.quote}>
                “Ada sensasi institutional: telemetry, latency cues, dan monitoring yang bikin percaya.”
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.cta} id="cta">
        <div className={styles.container}>
          <div className={styles.ctaShell} data-reveal>
            <div>
              <h2 className={styles.ctaTitle}>Ready to trade with institutional clarity?</h2>
              <p className={styles.ctaSub}>Mulai dari evaluasi yang rapi. Scale capital ketika konsistensi kamu terbukti.</p>
              <div className={styles.ctaActions}>
                <Link to="/register" className={styles.primaryBtn}>
                  Get Started
                </Link>
                <Link to="/track" className={styles.ghostBtn}>
                  Track My Portfolio
                </Link>
              </div>
            </div>
            <div className={styles.ctaSide}>
              <div className={styles.cm}>
                <span className={styles.cmK}>Infra</span>
                <span className={styles.cmV}>Realtime</span>
              </div>
              <div className={styles.cm}>
                <span className={styles.cmK}>Risk</span>
                <span className={styles.cmV}>Guarded</span>
              </div>
              <div className={styles.cm}>
                <span className={styles.cmK}>Ops</span>
                <span className={styles.cmV}>Alerts</span>
              </div>
            </div>
          </div>

          <div className={styles.disclaimer}>
            <span className={styles.dim}>
              Risk disclosure: Trading memiliki risiko. Konten ini bersifat informasi dan tidak merupakan nasihat investasi.
            </span>
          </div>
        </div>
      </section>
    </>
  );
}

