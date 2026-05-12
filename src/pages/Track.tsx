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

type ClosedTrade = {
  position_id: number;
  symbol: string;
  side: "BUY" | "SELL";
  volume: number;
  price_open: number;
  close_price: number;
  sl: number | null;
  tp: number | null;
  profit: number;
  open_time: number;
  close_time: number;
};

type StatePayload = {
  ok: boolean;
  server_time?: number;
  account?: Account | null;
  stats?: Stats | null;
  closed_trades?: ClosedTrade[];
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

  const statsLocal = useMemo(() => {
    if (!state?.closed_trades) return { winrate: "—", pnl: "—", trades: "—", floating: "—" };

    const floating = (Number(state.account?.equity) || 0) - (Number(state.account?.balance) || 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTs = Math.floor(todayStart.getTime() / 1000);

    const todayTrades = state.closed_trades.filter(t => t.close_time >= todayTs);
    const tradesCount = todayTrades.length;

    let wins = 0;
    let realizedPnl = 0;

    todayTrades.forEach(t => {
      realizedPnl += Number(t.profit) || 0;
      if (t.profit > 0) wins++;
    });

    const winrate = tradesCount > 0 ? ((wins / tradesCount) * 100).toFixed(1) + "%" : "0%";

    return {
      winrate,
      pnl: fmtMoney(realizedPnl, currency),
      trades: tradesCount.toString(),
      floating: fmtMoney(floating, currency)
    };
  }, [state?.closed_trades, state?.account, currency]);

  const load = async () => {
    setError(null);
    try {
      const res = await fetch("https://mt5.wongbantercapital.com/state", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as StatePayload;
      if (!res.ok || !data) {
        const maybe = data as unknown as { error?: unknown };
        setError(maybe && "error" in maybe && maybe.error ? String(maybe.error) : "Failed to fetch state");
        setState(null);
      } else {
        // Karena response mt5.wongbantercapital.com mungkin tidak ada 'ok: true' secara default
        data.ok = true;
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

      <div className={styles.bg} aria-hidden="true" />

      <div className={styles.head}>
        <div className={styles.headTop}>
          <div>
            <h1 className={styles.title}>Track My Portfolio</h1>
            <p className={styles.sub}>
              Performance tracker eksklusif. Data sinkron realtime dari eksekusi MT5.
            </p>
          </div>
          <button className={styles.refresh} type="button" onClick={load} disabled={loading}>
            {loading ? "Syncing…" : "Live Sync"}
          </button>
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}
      </div>

      <div className={styles.grid}>
        <div className={`${styles.card} ${styles.span4}`}>
          <div className={styles.cardHead}>
            <div>
              <div className={styles.cardTitle}>Account Overview</div>
              <div className={styles.cardSub}>Status koneksi ke MT5</div>
            </div>
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
            <div className={styles.kpi}>
              <span className={styles.k}>Margin Free</span>
              <span className={styles.v}>{fmt(state?.account?.margin_free, 2)}</span>
            </div>
          </div>
        </div>

        <div className={`${styles.card} ${styles.span8}`}>
          <div className={styles.cardHead}>
            <div>
              <div className={styles.cardTitle}>Performance Pulse</div>
              <div className={styles.cardSub}>Ringkasan metrics hari ini (Realtime)</div>
            </div>
            <span className={styles.chip}>Live Data</span>
          </div>
        <div className={`${styles.kpis} ${styles.kpisWide}`}>
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
              <span className={`${styles.v} ${styles.mono}`}>{statsLocal.floating}</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.k}>Realized (Today)</span>
              <span className={`${styles.v} ${styles.mono}`}>{statsLocal.pnl}</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.k}>Trades (Today)</span>
              <span className={styles.v}>{statsLocal.trades}</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.k}>Winrate (Today)</span>
              <span className={styles.v}>{statsLocal.winrate}</span>
            </div>
          </div>
        </div>

        <div className={`${styles.card} ${styles.span12}`}>
          <div className={styles.cardHead}>
            <div>
              <div className={styles.cardTitle}>Trade Journal</div>
              <div className={styles.cardSub}>Riwayat eksekusi terakhir</div>
            </div>
            <span className={styles.chip}>{(state?.closed_trades?.length ?? 0).toString()} Trades</span>
          </div>
          <div className={styles.tableWrap}>
            <div className={styles.table}>
              <div className={styles.thead}>
                <span>Time (Close)</span>
                <span>Symbol</span>
                <span>Side</span>
              <span className={`${styles.right} ${styles.colHide}`}>Open</span>
              <span className={`${styles.right} ${styles.colHide}`}>Close</span>
                <span className={styles.right}>PnL</span>
              </div>
              {(state?.closed_trades || []).slice(0, 30).map((t) => {
                const date = new Date(t.close_time * 1000);
                const timeStr = date.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                return (
                  <div key={t.position_id} className={styles.trow}>
                  <span className={`${styles.mono} ${styles.muted}`}>{timeStr}</span>
                    <span className={styles.mono}>{t.symbol}</span>
                    <span>
                      <span className={t.side === "BUY" ? styles.buy : styles.sell}>{t.side}</span>
                    </span>
                  <span className={`${styles.right} ${styles.mono} ${styles.colHide}`}>{t.price_open}</span>
                  <span className={`${styles.right} ${styles.mono} ${styles.colHide}`}>{t.close_price}</span>
                    <span className={`${styles.right} ${styles.mono} ${Number(t.profit) >= 0 ? styles.pos : styles.neg}`}>
                      {fmtMoney(t.profit, currency)}
                    </span>
                  </div>
                );
              })}
              {!loading && (!state?.closed_trades || state.closed_trades.length === 0) ? (
                <div className={styles.empty}>No closed trades available.</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
