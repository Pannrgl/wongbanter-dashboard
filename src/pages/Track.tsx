import { useEffect, useMemo, useState } from "react";

import { Seo } from "../components/common/Seo";
import styles from "../styles/track.module.css";

type Account = {
  login?: number;
  server?: string;
  currency?: string;
  leverage?: number;
  balance?: number;
  equity?: number;
  profit?: number;
  margin?: number;
  margin_free?: number;
  margin_level?: number | null;
};

type Stats = {
  net?: number;
  winrate?: number | null;
  profit_factor?: number | null;
  profit_factor_infinite?: boolean;
  orders_filled?: number;
  deals_in?: number;
  trades?: number;
};

type Position = {
  position_id: number;
  symbol: string;
  side: "BUY" | "SELL";
  volume: number;
  price_open: number;
  price_current: number;
  sl: number | null;
  tp: number | null;
  profit: number;
};

type StatePayload = {
  ok: boolean;
  server_time?: number;
  account?: Account | null;
  stats?: Stats | null;
  open_positions?: Position[];
};

function fmt(n: unknown, digits = 2) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(digits);
}

function fmtMoney(n: unknown, currency?: string) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}${currency ? ` ${currency}` : ""}`;
}

export function Track() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<StatePayload | null>(null);
  const currency = state?.account?.currency || "";

  const tradesToday = useMemo(() => {
    const s = state?.stats;
    if (!s) return "—";
    const v = s.orders_filled ?? s.deals_in ?? s.trades;
    return v === undefined || v === null ? "—" : String(v);
  }, [state?.stats]);

  const load = async () => {
    setError(null);
    try {
      const res = await fetch("https://mt5.wongbantercapital.com/state", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as StatePayload;
      if (!res.ok || !data || data.ok !== true) {
        const maybe = data as unknown as { error?: unknown };
        setError(maybe && "error" in maybe && maybe.error ? String(maybe.error) : "Failed to fetch state");
        setState(null);
      } else {
        setState(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setState(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = window.setInterval(load, 3000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <main className={styles.page}>
      <Seo title="Track My Portfolio — WongBanter Capital" description="Track account performance, equity, and positions in real time." />

      <div className={styles.head}>
        <div className={styles.headTop}>
          <div>
            <h1 className={styles.title}>Track My Portfolio</h1>
            <p className={styles.sub}>
              Overview akun dan posisi berjalan. Data bersumber dari executor MT5 melalui endpoint <span className={styles.mono}>/state</span>.
            </p>
          </div>
          <button className={styles.refresh} type="button" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Account</span>
            <span className={styles.chip}>{state?.account?.server ? "Connected" : "Waiting"}</span>
          </div>
          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <span className={styles.k}>Login</span>
              <span className={styles.v}>{state?.account?.login ?? "—"}</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.k}>Server</span>
              <span className={styles.v}>{state?.account?.server ?? "—"}</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.k}>Leverage</span>
              <span className={styles.v}>{state?.account?.leverage ? `1:${state.account.leverage}` : "—"}</span>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Portfolio</span>
            <span className={styles.chipAlt}>{(state?.open_positions?.length ?? 0) > 0 ? "Live" : "—"}</span>
          </div>
          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <span className={styles.k}>Balance</span>
              <span className={styles.v}>{fmt(state?.account?.balance, 2)}{currency ? ` ${currency}` : ""}</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.k}>Equity</span>
              <span className={styles.v}>{fmt(state?.account?.equity, 2)}{currency ? ` ${currency}` : ""}</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.k}>Floating PnL</span>
              <span className={styles.v}>{fmtMoney((Number(state?.account?.equity) || 0) - (Number(state?.account?.balance) || 0), currency)}</span>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Today</span>
            <span className={styles.chip}>Realtime</span>
          </div>
          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <span className={styles.k}>Realized PnL</span>
              <span className={styles.v}>{fmtMoney(state?.stats?.net, currency)}</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.k}>Trades</span>
              <span className={styles.v}>{tradesToday}</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.k}>Winrate</span>
              <span className={styles.v}>{state?.stats?.winrate === null || state?.stats?.winrate === undefined ? "—" : `${fmt(state.stats.winrate, 1)}%`}</span>
            </div>
          </div>
        </div>

        <div className={styles.cardWide}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Open Positions</span>
            <span className={styles.chipAlt}>{(state?.open_positions?.length ?? 0).toString()}</span>
          </div>
          <div className={styles.table}>
            <div className={styles.thead}>
              <span>Symbol</span>
              <span>Side</span>
              <span className={styles.right}>Volume</span>
              <span className={styles.right}>PnL</span>
            </div>
            {(state?.open_positions || []).slice(0, 20).map((p) => (
              <div key={p.position_id} className={styles.trow}>
                <span className={styles.mono}>{p.symbol}</span>
                <span className={p.side === "BUY" ? styles.buy : styles.sell}>{p.side}</span>
                <span className={`${styles.right} ${styles.mono}`}>{fmt(p.volume, 2)}</span>
                <span className={`${styles.right} ${styles.mono} ${Number(p.profit) >= 0 ? styles.pos : styles.neg}`}>
                  {fmtMoney(p.profit, currency)}
                </span>
              </div>
            ))}
            {!loading && (!state?.open_positions || state.open_positions.length === 0) ? (
              <div className={styles.empty}>No open positions.</div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
