import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";

import styles from "../styles/hero.module.css";

type TradingViewWidgetConfig = Record<string, unknown>;

function useTradingViewWidget(scriptSrc: string, config: TradingViewWidgetConfig) {
  const ref = useRef<HTMLDivElement | null>(null);
  const cfg = useMemo(() => JSON.stringify(config), [config]);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.innerHTML = "";
    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = cfg;
    host.appendChild(script);
    return () => {
      host.innerHTML = "";
    };
  }, [scriptSrc, cfg]);

  return ref;
}

export function Hero() {
  const tickerRef = useTradingViewWidget("https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js", {
    symbols: [
      { proName: "FX_IDC:EURUSD", title: "EURUSD" },
      { proName: "FX_IDC:GBPUSD", title: "GBPUSD" },
      { proName: "FX_IDC:USDJPY", title: "USDJPY" },
      { proName: "OANDA:XAUUSD", title: "XAUUSD" },
      { proName: "CME_MINI:NQ1!", title: "NAS100" },
      { proName: "CME_MINI:ES1!", title: "SPX" },
      { proName: "BITSTAMP:BTCUSD", title: "BTC" },
      { proName: "BITSTAMP:ETHUSD", title: "ETH" }
    ],
    showSymbolLogo: true,
    colorTheme: "dark",
    isTransparent: true,
    displayMode: "adaptive",
    locale: "en"
  });

  const chartRef = useTradingViewWidget("https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js", {
    symbols: [["OANDA:XAUUSD|1D"], ["FX_IDC:EURUSD|240"], ["BITSTAMP:BTCUSD|60"]],
    chartOnly: false,
    width: "100%",
    height: "100%",
    locale: "en",
    colorTheme: "dark",
    autosize: true,
    isTransparent: true,
    showVolume: false,
    showMA: false,
    hideDateRanges: false,
    hideMarketStatus: false,
    hideSymbolLogo: false,
    scalePosition: "right",
    scaleMode: "Normal",
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    fontSize: "12",
    noTimeScale: false,
    valuesTracking: "1",
    changeMode: "price-and-percent",
    backgroundColor: "rgba(0, 0, 0, 0)",
    gridLineColor: "rgba(255, 255, 255, 0.08)"
  });

  return (
    <section className={styles.hero} aria-label="Hero">
      <div className={styles.ticker} ref={tickerRef} />

      <div className={styles.inner}>
        <div className={styles.copy}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            <span className={styles.badgeText}>Premium free signal platform</span>
            <span className={styles.badgeChip}>Live transparency</span>
          </div>
          <h1 className={styles.title}>
            Institutional Signals.
            <br />
            <span className={styles.grad}>Realtime Proof.</span>
          </h1>
          <p className={styles.sub}>
            Free signal XAUUSD + market analysis dengan format rapi dan risk-aware. Semua dibangun dengan gaya institutional dan transparansi
            realtime.
          </p>
          <div className={styles.actions}>
            <Link to="/register" className={styles.primary}>
              Get Free Signals
            </Link>
            <a className={styles.ghost} href="https://mt5.wongbantercapital.com/">
              View Live Portfolio
            </a>
          </div>
          <div className={styles.trust}>
            <span className={styles.trustPill}>Realtime dashboard</span>
            <span className={styles.trustPill}>Institutional analysis</span>
            <span className={styles.trustPill}>Smart risk management</span>
          </div>
        </div>

        <div className={styles.visual} aria-label="Market visualization">
          <div className={styles.visualShell}>
            <div className={styles.visualTop}>
              <div className={styles.visualTitle}>
                <div className={styles.vtMain}>Market Overview</div>
                <div className={styles.vtSub}>Live chart background</div>
              </div>
              <div className={styles.visualPills}>
                <span className={styles.pill}>WBC Signals</span>
                <span className={styles.pillOk}>Live</span>
              </div>
            </div>
            <div className={styles.chartWrap}>
              <div className={styles.chart} ref={chartRef} />
            </div>
          </div>
          <div className={styles.scroll} aria-hidden="true">
            <span className={styles.scrollText}>Scroll</span>
            <span className={styles.scrollDot} />
          </div>
        </div>
      </div>
    </section>
  );
}
