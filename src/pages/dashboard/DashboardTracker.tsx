import { useEffect, useMemo, useState } from "react";

import { Seo } from "../../components/common/Seo";
import styles from "../../styles/dashboard.module.css";

type ClosedTrade = {
  position_id: number;
  symbol: string;
  side: "BUY" | "SELL";
  volume: number;
  profit: number;
  close_time: number;
};

type Account = {
  currency?: string;
};

type Payload = {
  account?: Account | null;
  closed_trades?: ClosedTrade[];
};

function fmtMoney(v: unknown, currency?: string) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}${currency ? ` ${currency}` : ""}`;
}

export function DashboardTracker() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Payload | null>(null);
  const [q, setQ] = useState("");
  const [side, setSide] = useState<"ALL" | "BUY" | "SELL">("ALL");

  const currency = data?.account?.currency || "";

  const trades = useMemo(() => {
    const list = data?.closed_trades || [];
    const query = q.trim().toUpperCase();
    return list.filter((t) => {
      if (side !== "ALL" && t.side !== side) return false;
      if (!query) return true;
      return (t.symbol || "").toUpperCase().includes(query);
    });
  }, [data?.closed_trades, q, side]);

  const summary = useMemo(() => {
    const pnl = trades.reduce((a, t) => a + (Number(t.profit) || 0), 0);
    const wins = trades.reduce((a, t) => a + (t.profit > 0 ? 1 : 0), 0);
    const wr = trades.length ? (wins / trades.length) * 100 : 0;
    const vol = trades.reduce((a, t) => a + (Number(t.volume) || 0), 0);
    return { pnl, wr, count: trades.length, vol };
  }, [trades]);

  const load = async () => {
    setError(null);
    try {
      const res = await fetch("https://mt5.wongbantercapital.com/state", { cache: "no-store" });
      const payload = (await res.json().catch(() => ({}))) as Payload;
      if (!res.ok) {
        setError("Failed to fetch state");
        setData(null);
      } else {
        setData(payload);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <Seo title="Trading Tracker — WongBanter Dashboard" description="Track transaksi dan ringkasan performa." />

      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Trading Tracker</div>
          <div className={styles.pageSub}>Filter transaksi dan lihat ringkasan performa secara cepat.</div>
        </div>
        <button className={`${styles.btn} ${styles.btnGhost}`} type="button" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {error ? <div className={`${styles.msg} ${styles.err}`}>{error}</div> : null}

      <div className={styles.contentGrid}>
        <div className={`${styles.card} ${styles.span12}`}>
          <div className={styles.row}>
            <div className={styles.field} style={{ marginTop: 0, flex: 1 }}>
              <span className={styles.labelText}>Search symbol</span>
              <input className={styles.input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="XAUUSD, EURUSD, ..." />
            </div>
            <div className={styles.field} style={{ marginTop: 0, width: 180 }}>
              <span className={styles.labelText}>Side</span>
              <select className={styles.input} value={side} onChange={(e) => setSide(e.target.value as typeof side)}>
                <option value="ALL">All</option>
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
          </div>
          <div className={styles.msg}>Showing {trades.length} trades</div>
        </div>

        <div className={`${styles.card} ${styles.span6}`}>
          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <div className={styles.k}>Net PnL (Filtered)</div>
              <div className={`${styles.v} ${styles.mono}`}>{fmtMoney(summary.pnl, currency)}</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.k}>Winrate</div>
              <div className={styles.v}>{summary.wr.toFixed(1)}%</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.k}>Trades</div>
              <div className={styles.v}>{summary.count}</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.k}>Total Volume</div>
              <div className={styles.v}>{summary.vol.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className={`${styles.card} ${styles.span6}`}>
          <div className={styles.k}>Quick Insights</div>
          <div className={styles.msg}>
            Gunakan filter symbol/side untuk isolasi performa per pair. Ini dibuat ringan (tanpa chart library) agar loading cepat.
          </div>
        </div>

        <div className={`${styles.card} ${styles.span12}`}>
          <div className={styles.row}>
            <div className={styles.k}>Trades</div>
            <span className={styles.pill}>Interactive</span>
          </div>
          <div className={styles.table}>
            <div className={styles.thead}>
              <span>Time</span>
              <span>Symbol</span>
              <span>Side</span>
              <span className={styles.right}>PnL</span>
            </div>
            {trades.slice(0, 80).map((t) => {
              const time = new Date(t.close_time * 1000).toLocaleString("id-ID", { hour12: false });
              return (
                <div key={t.position_id} className={styles.trow}>
                  <span className={styles.mono} style={{ color: "rgba(255,255,255,0.66)" }}>
                    {time}
                  </span>
                  <span className={styles.mono}>{t.symbol}</span>
                  <span>{t.side === "BUY" ? <span className={styles.tagBuy}>BUY</span> : <span className={styles.tagSell}>SELL</span>}</span>
                  <span className={`${styles.right} ${styles.mono}`}>{fmtMoney(t.profit, currency)}</span>
                </div>
              );
            })}
            {!loading && trades.length === 0 ? <div className={styles.msg}>No results.</div> : null}
          </div>
        </div>
      </div>
    </>
  );
}

