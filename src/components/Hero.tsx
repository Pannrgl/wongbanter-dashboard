import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef } from "react";

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
    <section className={styles.hero}>
      <div className={styles.ticker} ref={tickerRef} />

      <div className={styles.inner}>
        <div className={styles.copy}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            <span className={styles.badgeText}>Capital built for modern traders</span>
            <span className={styles.badgeChip}>Institutional workflow</span>
          </div>
          <h1 className={styles.title}>
            Trade With Institutional <span className={styles.grad}>Precision</span>
          </h1>
          <p className={styles.sub}>
            Execution presisi, risk intelligence, dan real-time monitoring—dirancang untuk trader yang ingin scale dengan disiplin, clarity, dan
            sistem.
          </p>
          <div className={styles.actions}>
            <Link to="/register" className={styles.primary}>
              Get Started
            </Link>
            <Link to="/track" className={styles.ghost}>
              Track My Portfolio
            </Link>
          </div>
          <div className={styles.trust}>
            <span className={styles.trustPill}>Secure transport</span>
            <span className={styles.trustPill}>Audit-ready logs</span>
            <span className={styles.trustPill}>Realtime telemetry</span>
          </div>
        </div>

        <div className={styles.visual} aria-label="Market visualization">
          <div className={styles.visualShell}>
            <div className={styles.visualTop}>
              <div className={styles.visualTitle}>
                <div className={styles.vtMain}>Market Overview</div>
                <div className={styles.vtSub}>TradingView-powered live pricing</div>
              </div>
              <div className={styles.visualPills}>
                <span className={styles.pill}>WBC Edge</span>
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

