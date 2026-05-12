import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

import { Hero } from "../components/Hero";
import { Seo } from "../components/common/Seo";
import styles from "../styles/landing.module.css";

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
  useCounters();
  const reduced = useReducedMotion();
  const y = reduced ? 0 : 16;
  const ease = [0.16, 1, 0.3, 1] as const;
  const reveal = { initial: { opacity: 0, y }, whileInView: { opacity: 1, y: 0 } };

  return (
    <>
      <Seo
        title="WongBanter Capital — Premium Free Trading Signals With Live Transparency"
        description="Premium free trading signals with real-time transparency. Track live trading performance and institutional-style market analysis."
      />

      <Hero />

      <section className={styles.section} id="performance">
        <div className={styles.container}>
          <motion.div className={styles.head} {...reveal} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, ease }}>
            <h2 className={styles.h2}>Live performance preview</h2>
            <p className={styles.p}>
              Ini preview visual untuk marketing. Live dashboard asli berada di{" "}
              <a className={styles.inlineLink} href="https://dashboard.wongbantercapital.com">
                dashboard.wongbantercapital.com
              </a>
              .
            </p>
          </motion.div>

          <div className={styles.perfGrid}>
            <motion.div className={styles.perfChart} {...reveal} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.75, ease }}>
              <div className={styles.perfTop}>
                <div>
                  <div className={styles.kicker}>Equity growth</div>
                  <div className={styles.perfTitle}>Institutional-style curve</div>
                </div>
                <div className={styles.perfBadges}>
                  <span className={styles.badgeGood}>Realtime</span>
                  <span className={styles.badgeGold}>Transparent</span>
                </div>
              </div>
              <div className={styles.svgWrap} aria-label="Equity curve preview">
                <svg className={styles.svg} viewBox="0 0 760 260" role="img" aria-label="Equity curve">
                  <defs>
                    <linearGradient id="wbcStroke" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor="rgba(34,255,175,0.95)" />
                      <stop offset="0.55" stopColor="rgba(255,215,95,0.92)" />
                      <stop offset="1" stopColor="rgba(34,255,175,0.85)" />
                    </linearGradient>
                    <linearGradient id="wbcFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="rgba(34,255,175,0.18)" />
                      <stop offset="1" stopColor="rgba(34,255,175,0.00)" />
                    </linearGradient>
                    <filter id="wbcGlow" x="-20%" y="-40%" width="140%" height="180%">
                      <feGaussianBlur stdDeviation="6" result="blur" />
                      <feColorMatrix
                        in="blur"
                        type="matrix"
                        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 14 -6"
                        result="glow"
                      />
                      <feMerge>
                        <feMergeNode in="glow" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <path
                    className={styles.gridLine}
                    d="M30 40H730 M30 90H730 M30 140H730 M30 190H730 M30 240H730"
                    fill="none"
                  />
                  <path
                    className={styles.gridLine}
                    d="M30 20V240 M150 20V240 M270 20V240 M390 20V240 M510 20V240 M630 20V240 M730 20V240"
                    fill="none"
                  />
                  <motion.path
                    d="M30 210 C 85 205, 92 172, 140 175 C 210 180, 210 120, 280 126 C 350 132, 350 88, 420 92 C 496 96, 520 58, 590 68 C 660 78, 670 42, 730 50"
                    fill="none"
                    stroke="url(#wbcStroke)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    filter="url(#wbcGlow)"
                    initial={{ pathLength: 0, opacity: 0.4 }}
                    whileInView={{ pathLength: 1, opacity: 1 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 1.2, ease }}
                  />
                  <path
                    d="M30 210 C 85 205, 92 172, 140 175 C 210 180, 210 120, 280 126 C 350 132, 350 88, 420 92 C 496 96, 520 58, 590 68 C 660 78, 670 42, 730 50 L730 240 L30 240 Z"
                    fill="url(#wbcFill)"
                    opacity="0.95"
                  />
                </svg>
              </div>
              <div className={styles.perfNote}>
                Preview only — data live tampil di dashboard. Konten ini bukan nasihat investasi.
              </div>
            </motion.div>

            <div className={styles.perfCards}>
              <motion.div className={styles.perfCard} {...reveal} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 0.7, ease }}>
                <div className={styles.perfCardTop}>
                  <span className={styles.perfK}>Running profit</span>
                  <span className={styles.tagGood}>Live</span>
                </div>
                <div className={styles.perfV}>
                  <span data-counter="3.42">0</span>
                  <span className={styles.unit}>%</span>
                </div>
                <div className={styles.perfSub}>Equity vs balance (preview)</div>
              </motion.div>

              <motion.div className={styles.perfCard} {...reveal} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 0.7, ease, delay: 0.05 }}>
                <div className={styles.perfCardTop}>
                  <span className={styles.perfK}>Winrate</span>
                  <span className={styles.tagGold}>Consistency</span>
                </div>
                <div className={styles.perfV}>
                  <span data-counter="64.8">0</span>
                  <span className={styles.unit}>%</span>
                </div>
                <div className={styles.perfSub}>Based on last 30 trades (preview)</div>
              </motion.div>

              <motion.div className={styles.perfCard} {...reveal} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 0.7, ease, delay: 0.1 }}>
                <div className={styles.perfCardTop}>
                  <span className={styles.perfK}>Monthly return</span>
                  <span className={styles.tag}>Stable</span>
                </div>
                <div className={styles.perfV}>
                  <span data-counter="8.6">0</span>
                  <span className={styles.unit}>%</span>
                </div>
                <div className={styles.perfSub}>Average monthly (preview)</div>
              </motion.div>

              <motion.div className={styles.perfCard} {...reveal} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 0.7, ease, delay: 0.15 }}>
                <div className={styles.perfCardTop}>
                  <span className={styles.perfK}>Total pips</span>
                  <span className={styles.tag}>XAU / FX</span>
                </div>
                <div className={styles.perfV}>
                  <span data-counter="1274">0</span>
                </div>
                <div className={styles.perfSub}>All-time (preview)</div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} id="signals">
        <div className={styles.container}>
          <motion.div className={styles.head} {...reveal} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, ease }}>
            <h2 className={styles.h2}>Free signal showcase</h2>
            <p className={styles.p}>
              Format signal dibuat jelas, risk-aware, dan mudah dieksekusi. Contoh di bawah hanya untuk showcase.
            </p>
          </motion.div>

          <div className={styles.signalGrid}>
            <motion.div className={styles.signalCard} {...reveal} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.65, ease }}>
              <div className={styles.signalTop}>
                <div className={styles.signalPair}>
                  <span className={styles.pair}>XAUUSD</span>
                  <span className={styles.pairMeta}>M15 • Intraday</span>
                </div>
                <span className={styles.statusLive}>Setup</span>
              </div>
              <div className={styles.signalBody}>
                <div className={styles.signalRow}>
                  <span className={styles.key}>Bias</span>
                  <span className={styles.valGood}>BUY</span>
                </div>
                <div className={styles.signalRow}>
                  <span className={styles.key}>Entry</span>
                  <span className={styles.valMono}>2348.40</span>
                </div>
                <div className={styles.signalRow}>
                  <span className={styles.key}>SL</span>
                  <span className={styles.valMono}>2339.60</span>
                </div>
                <div className={styles.signalRow}>
                  <span className={styles.key}>TP</span>
                  <span className={styles.valMono}>2366.20</span>
                </div>
              </div>
              <div className={styles.signalFoot}>
                <span className={styles.chip}>R:R 1:2</span>
                <span className={styles.chipGold}>Institutional</span>
                <span className={styles.chipDim}>Example</span>
              </div>
            </motion.div>

            <motion.div
              className={styles.signalCard}
              {...reveal}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.65, ease, delay: 0.05 }}
            >
              <div className={styles.signalTop}>
                <div className={styles.signalPair}>
                  <span className={styles.pair}>GBPUSD</span>
                  <span className={styles.pairMeta}>H1 • Trend</span>
                </div>
                <span className={styles.statusWait}>Plan</span>
              </div>
              <div className={styles.signalBody}>
                <div className={styles.signalRow}>
                  <span className={styles.key}>Bias</span>
                  <span className={styles.valBad}>SELL</span>
                </div>
                <div className={styles.signalRow}>
                  <span className={styles.key}>Entry</span>
                  <span className={styles.valMono}>1.27860</span>
                </div>
                <div className={styles.signalRow}>
                  <span className={styles.key}>SL</span>
                  <span className={styles.valMono}>1.28310</span>
                </div>
                <div className={styles.signalRow}>
                  <span className={styles.key}>TP</span>
                  <span className={styles.valMono}>1.27020</span>
                </div>
              </div>
              <div className={styles.signalFoot}>
                <span className={styles.chip}>R:R 1:1.8</span>
                <span className={styles.chip}>Liquidity</span>
                <span className={styles.chipDim}>Example</span>
              </div>
            </motion.div>

            <motion.div
              className={styles.signalCard}
              {...reveal}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.65, ease, delay: 0.1 }}
            >
              <div className={styles.signalTop}>
                <div className={styles.signalPair}>
                  <span className={styles.pair}>EURUSD</span>
                  <span className={styles.pairMeta}>M30 • Mean reversion</span>
                </div>
                <span className={styles.statusLive}>Setup</span>
              </div>
              <div className={styles.signalBody}>
                <div className={styles.signalRow}>
                  <span className={styles.key}>Bias</span>
                  <span className={styles.valGood}>BUY</span>
                </div>
                <div className={styles.signalRow}>
                  <span className={styles.key}>Entry</span>
                  <span className={styles.valMono}>1.08420</span>
                </div>
                <div className={styles.signalRow}>
                  <span className={styles.key}>SL</span>
                  <span className={styles.valMono}>1.08130</span>
                </div>
                <div className={styles.signalRow}>
                  <span className={styles.key}>TP</span>
                  <span className={styles.valMono}>1.08990</span>
                </div>
              </div>
              <div className={styles.signalFoot}>
                <span className={styles.chip}>R:R 1:2</span>
                <span className={styles.chipGold}>Precision</span>
                <span className={styles.chipDim}>Example</span>
              </div>
            </motion.div>
          </div>

          <motion.div
            className={styles.signalCta}
            {...reveal}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.75, ease }}
          >
            <div>
              <div className={styles.kicker}>Premium • Free</div>
              <div className={styles.signalCtaTitle}>Get free signals + market analysis</div>
              <div className={styles.signalCtaSub}>
                Dapatkan update signal dan analisa dengan format rapi. Fokus pada risk management dan execution.
              </div>
            </div>
            <div className={styles.signalCtaActions}>
              <Link to="/register" className={styles.primaryBtn}>
                Get Free Signals
              </Link>
              <a className={styles.ghostBtn} href="https://dashboard.wongbantercapital.com">
                View Live Portfolio
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <section className={styles.section} id="trust">
        <div className={styles.container}>
          <motion.div className={styles.head} {...reveal} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, ease }}>
            <h2 className={styles.h2}>Why traders trust us</h2>
            <p className={styles.p}>
              Transparansi + proses institutional. Semua dibuat untuk membantu trader berpikir lebih jelas dan lebih disiplin.
            </p>
          </motion.div>

          <div className={styles.trustGrid}>
            <motion.div className={styles.trustCard} {...reveal} viewport={{ once: true, amount: 0.28 }} transition={{ duration: 0.65, ease }}>
              <div className={styles.trustIcon} />
              <div className={styles.h3}>Realtime transparency</div>
              <div className={styles.p2}>
                Live performance dapat dipantau publik lewat dashboard realtime—tanpa edit, tanpa cherry-pick.
              </div>
            </motion.div>
            <motion.div
              className={styles.trustCard}
              {...reveal}
              viewport={{ once: true, amount: 0.28 }}
              transition={{ duration: 0.65, ease, delay: 0.05 }}
            >
              <div className={styles.trustIcon2} />
              <div className={styles.h3}>Institutional analysis</div>
              <div className={styles.p2}>Bias, level penting, dan konteks risk disusun seperti desk profesional.</div>
            </motion.div>
            <motion.div
              className={styles.trustCard}
              {...reveal}
              viewport={{ once: true, amount: 0.28 }}
              transition={{ duration: 0.65, ease, delay: 0.1 }}
            >
              <div className={styles.trustIcon3} />
              <div className={styles.h3}>Smart risk management</div>
              <div className={styles.p2}>R:R jelas, SL/TP terukur, dan rule yang menjaga konsistensi.</div>
            </motion.div>
            <motion.div
              className={styles.trustCard}
              {...reveal}
              viewport={{ once: true, amount: 0.28 }}
              transition={{ duration: 0.65, ease, delay: 0.15 }}
            >
              <div className={styles.trustIcon4} />
              <div className={styles.h3}>Fast execution</div>
              <div className={styles.p2}>Setup disajikan ringkas agar eksekusi tidak telat dan keputusan tetap objektif.</div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className={styles.section} id="community">
        <div className={styles.container}>
          <motion.div className={styles.head} {...reveal} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, ease }}>
            <h2 className={styles.h2}>Community & testimonials</h2>
            <p className={styles.p}>Vibe komunitas modern: cepat, rapi, saling review. Testimonial di bawah contoh placeholder.</p>
          </motion.div>

          <div className={styles.commGrid}>
            <motion.div className={styles.commCard} {...reveal} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.65, ease }}>
              <div className={styles.commTop}>
                <div className={styles.avatar} />
                <div>
                  <div className={styles.testName}>Rafi A.</div>
                  <div className={styles.testRole}>XAU / FX trader</div>
                </div>
                <div className={styles.stars} aria-label="5 stars">
                  ★★★★★
                </div>
              </div>
              <div className={styles.quote}>
                “Signal formatnya clean, rasionya jelas. Paling suka karena ada transparansi performance yang bisa dicek publik.”
              </div>
            </motion.div>

            <motion.div
              className={styles.commCard}
              {...reveal}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.65, ease, delay: 0.05 }}
            >
              <div className={styles.commTop}>
                <div className={styles.avatar2} />
                <div>
                  <div className={styles.testName}>Nadia S.</div>
                  <div className={styles.testRole}>Index trader</div>
                </div>
                <div className={styles.stars} aria-label="5 stars">
                  ★★★★★
                </div>
              </div>
              <div className={styles.quote}>
                “UI-nya premium dan fokus ke hal penting. Enak buat ikutin plan, ga bikin overtrade.”
              </div>
            </motion.div>

            <motion.div
              className={styles.commCard}
              {...reveal}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.65, ease, delay: 0.1 }}
            >
              <div className={styles.commTop}>
                <div className={styles.avatar3} />
                <div>
                  <div className={styles.testName}>Kevin T.</div>
                  <div className={styles.testRole}>Systematic trader</div>
                </div>
                <div className={styles.stars} aria-label="5 stars">
                  ★★★★★
                </div>
              </div>
              <div className={styles.quote}>
                “Konsisten, tidak banyak gimmick. Ini berasa platform hedge fund mini, bukan grup signal abal.”
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className={styles.cta} id="cta">
        <div className={styles.container}>
          <motion.div className={styles.ctaShell} {...reveal} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.8, ease }}>
            <div>
              <div className={styles.kicker}>Live transparency</div>
              <h2 className={styles.ctaTitle}>Track My Live Trading Performance</h2>
              <p className={styles.ctaSub}>
                Lihat dashboard realtime untuk memantau equity, posisi berjalan, dan performa secara transparan.
              </p>
              <div className={styles.ctaActions}>
                <a className={styles.primaryBtn} href="https://dashboard.wongbantercapital.com">
                  View Live Portfolio
                </a>
                <Link to="/register" className={styles.ghostBtn}>
                  Get Free Signals
                </Link>
              </div>
            </div>
            <div className={styles.ctaSide}>
              <div className={styles.cm}>
                <span className={styles.cmK}>Signals</span>
                <span className={styles.cmV}>XAUUSD</span>
              </div>
              <div className={styles.cm}>
                <span className={styles.cmK}>Style</span>
                <span className={styles.cmV}>Institutional</span>
              </div>
              <div className={styles.cm}>
                <span className={styles.cmK}>Transparency</span>
                <span className={styles.cmV}>Realtime</span>
              </div>
            </div>
          </motion.div>

          <footer className={styles.footer} aria-label="Footer">
            <div className={styles.footerInner}>
              <div className={styles.footerBrand}>
                <div className={styles.footerMark}>WB</div>
                <div>
                  <div className={styles.footerTitle}>WongBanter Capital</div>
                  <div className={styles.footerSub}>Premium Free Signal Platform • Live Transparency</div>
                </div>
              </div>
              <div className={styles.footerLinks}>
                <a className={styles.footerLink} href="#signals">
                  Signals
                </a>
                <a className={styles.footerLink} href="#trust">
                  Trust
                </a>
                <a className={styles.footerLink} href="#community">
                  Community
                </a>
                <a className={styles.footerLink} href="https://dashboard.wongbantercapital.com">
                  Live Portfolio
                </a>
              </div>
              <div className={styles.social}>
                <a className={styles.socialBtn} href="https://t.me/" aria-label="Telegram">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M21.7 3.9c.3-1.3-.5-1.8-1.6-1.4L2.8 9.3c-1.2.5-1.2 1.2-.2 1.5l4.5 1.4L18 5.4c.6-.4 1.1-.2.7.2L9.8 13.8l-.3 4.7c.5 0 .7-.2 1-.5l2.2-2.1 4.6 3.4c.9.5 1.5.2 1.7-.8l2.7-14.6Z"
                      fill="currentColor"
                      opacity="0.9"
                    />
                  </svg>
                </a>
                <a className={styles.socialBtn} href="https://discord.com/" aria-label="Discord">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M20.3 6.2A16.3 16.3 0 0 0 16.4 5l-.2.4c1.4.4 2.5 1 3.2 1.6a12 12 0 0 0-3.9-1.2 15 15 0 0 0-7 0A12 12 0 0 0 4.6 7c.7-.6 1.8-1.2 3.2-1.6L7.6 5a16.3 16.3 0 0 0-3.9 1.2C1.4 10 1 13.7 1 17.4c1.3 1 2.6 1.6 3.9 2l.9-1.3c-1-.3-2-.8-2.8-1.4l.7-.5c1.7 1.2 3.6 1.8 5.6 2 2 .2 4 0 5.8-.7 1.1-.4 2.1-1 3-1.7l.7.5c-.8.6-1.8 1.1-2.8 1.4l.9 1.3c1.3-.4 2.6-1 3.9-2 0-3.7-.4-7.4-2.7-11.2ZM8.8 15.2c-.8 0-1.4-.7-1.4-1.6 0-.9.6-1.6 1.4-1.6s1.4.7 1.4 1.6c0 .9-.6 1.6-1.4 1.6Zm6.4 0c-.8 0-1.4-.7-1.4-1.6 0-.9.6-1.6 1.4-1.6s1.4.7 1.4 1.6c0 .9-.6 1.6-1.4 1.6Z"
                      fill="currentColor"
                      opacity="0.9"
                    />
                  </svg>
                </a>
                <a className={styles.socialBtn} href="https://x.com/" aria-label="X">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M18.6 2H21l-7.2 8.3L22 22h-6.4l-5-6.2L5 22H2.6l7.7-8.8L2 2h6.6l4.5 5.5L18.6 2Zm-1.1 18h1.3L7.9 3.9H6.5L17.5 20Z"
                      fill="currentColor"
                      opacity="0.9"
                    />
                  </svg>
                </a>
              </div>
            </div>
            <div className={styles.disclaimer}>
              <span className={styles.dim}>
                Risk disclosure: Trading memiliki risiko. Konten ini bersifat informasi dan tidak merupakan nasihat investasi.
              </span>
              <span className={styles.dim}>© {new Date().getFullYear()} WongBanter Capital</span>
            </div>
          </footer>
        </div>
      </section>
    </>
  );
}

