import { useEffect, useMemo, useState } from "react";

import { Seo } from "../../components/common/Seo";
import styles from "../../styles/dashboard.module.css";

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

type ClosedTrade = {
  position_id: number;
  symbol: string;
  side: "BUY" | "SELL";
  volume: number;
  price_open: number;
  close_price: number;
  profit: number;
  close_time: number;
};

type StatePayload = {
  account?: Account | null;
  closed_trades?: ClosedTrade[];
};

function fmtNum(v: unknown, digits = 2) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function fmtMoney(v: unknown, currency?: string) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}${currency ? ` ${currency}` : ""}`;
}

function dayKeyFromSec(sec: number) {
  const d = new Date(sec * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shortDayLabel(key: string) {
  const [, m, d] = key.split("-");
  return `${d}/${m}`;
}

export function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StatePayload | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const currency = data?.account?.currency || "";
  const trades = useMemo(() => data?.closed_trades ?? [], [data?.closed_trades]);

  const todayStartSec = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return Math.floor(d.getTime() / 1000);
  }, []);

  const kpis = useMemo(() => {
    const account = data?.account;
    const balance = Number(account?.balance) || 0;
    const equity = Number(account?.equity) || 0;
    const floating = equity - balance;

    const today = trades.filter((t) => t.close_time >= todayStartSec);
    const todayPnl = today.reduce((a, t) => a + (Number(t.profit) || 0), 0);
    const wins = today.reduce((a, t) => a + (t.profit > 0 ? 1 : 0), 0);
    const winrate = today.length ? (wins / today.length) * 100 : 0;

    return {
      floating,
      todayPnl,
      winrate,
      todayTrades: today.length,
    };
  }, [data?.account, trades, todayStartSec]);

  const daily = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of trades) {
      const k = dayKeyFromSec(t.close_time);
      map.set(k, (map.get(k) || 0) + (Number(t.profit) || 0));
    }
    const keys = Array.from(map.keys()).sort();
    const last = keys.slice(-14);
    const rows = last.map((k) => ({ day: k, pnl: map.get(k) || 0 }));
    const maxAbs = rows.reduce((m, r) => Math.max(m, Math.abs(r.pnl)), 0) || 1;
    return { rows, maxAbs };
  }, [trades]);

  const filteredTrades = useMemo(() => {
    if (!selectedDay) return trades.slice(0, 40);
    return trades.filter((t) => dayKeyFromSec(t.close_time) === selectedDay).slice(0, 60);
  }, [trades, selectedDay]);

  const load = async () => {
    setError(null);
    try {
      const res = await fetch("https://mt5.wongbantercapital.com/state", { cache: "no-store" });
      const payload = (await res.json().catch(() => ({}))) as StatePayload;
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
    const t = window.setInterval(load, 5000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <>
      <Seo title="Dashboard — WongBanter Capital" description="Dashboard overview & MT5 tracking." />

      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>MT5 Dashboard</div>
          <div className={styles.pageSub}>Overview akun, daily PnL, dan trade journal.</div>
        </div>
        <div className={styles.row}>
          <span className={styles.pill}>{data?.account?.server ? "Connected" : loading ? "Syncing…" : "Waiting"}</span>
          <button className={`${styles.btn} ${styles.btnGhost}`} type="button" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error ? <div className={`${styles.msg} ${styles.err}`}>{error}</div> : null}

      <div className={styles.contentGrid}>
        <div className={`${styles.card} ${styles.span4}`}>
          <div className={styles.row}>
            <div>
              <div className={styles.k}>Account</div>
              <div className={`${styles.v} ${styles.mono}`}>{data?.account?.login ?? "—"}</div>
            </div>
            <span className={styles.pill}>{data?.account?.server ? "MT5" : "—"}</span>
          </div>
          <div className={styles.msg}>{data?.account?.server || "—"}</div>
          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <div className={styles.k}>Balance</div>
              <div className={styles.v}>
                {fmtNum(data?.account?.balance, 2)}
                {currency ? ` ${currency}` : ""}
              </div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.k}>Equity</div>
              <div className={styles.v}>
                {fmtNum(data?.account?.equity, 2)}
                {currency ? ` ${currency}` : ""}
              </div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.k}>Floating</div>
              <div className={`${styles.v} ${styles.mono}`}>{fmtMoney(kpis.floating, currency)}</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.k}>Margin Free</div>
              <div className={styles.v}>{fmtNum(data?.account?.margin_free, 2)}</div>
            </div>
          </div>
        </div>

        <div className={`${styles.card} ${styles.span8}`}>
          <div className={styles.row}>
            <div>
              <div className={styles.k}>Today</div>
              <div className={styles.msg}>Ringkasan performa hari ini.</div>
            </div>
            <span className={styles.pill}>{selectedDay ? `Filter: ${shortDayLabel(selectedDay)}` : "All"}</span>
          </div>
          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <div className={styles.k}>Realized PnL</div>
              <div className={`${styles.v} ${styles.mono}`}>{fmtMoney(kpis.todayPnl, currency)}</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.k}>Trades</div>
              <div className={styles.v}>{kpis.todayTrades}</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.k}>Winrate</div>
              <div className={styles.v}>{Number.isFinite(kpis.winrate) ? `${kpis.winrate.toFixed(1)}%` : "—"}</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.k}>Leverage</div>
              <div className={styles.v}>{data?.account?.leverage ? `1:${data.account.leverage}` : "—"}</div>
            </div>
          </div>

          <div className={styles.msg} style={{ marginTop: 12 }}>
            Daily PnL (last 14 days) — tap bar untuk filter.
          </div>
          <div className={styles.bars}>
            {daily.rows.map((r) => {
              const w = `${Math.round((Math.abs(r.pnl) / daily.maxAbs) * 100)}%`;
              const active = selectedDay === r.day;
              return (
                <button
                  key={r.day}
                  type="button"
                  onClick={() => setSelectedDay((cur) => (cur === r.day ? null : r.day))}
                  className={styles.barRow}
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                    textAlign: "left",
                    opacity: active ? 1 : 0.86,
                  }}
                >
                  <span className={styles.barLabel}>{shortDayLabel(r.day)}</span>
                  <span className={styles.barTrack} aria-hidden="true">
                    <span className={styles.barFill} style={{ width: w, opacity: r.pnl >= 0 ? 1 : 0.55 }} />
                  </span>
                  <span className={styles.barVal}>{fmtMoney(r.pnl, currency)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`${styles.card} ${styles.span12}`}>
          <div className={styles.row}>
            <div>
              <div className={styles.k}>Trade Journal</div>
              <div className={styles.pageSub}>Riwayat trade terbaru. Kolom ringkas untuk cepat scan.</div>
            </div>
            <span className={styles.pill}>{(data?.closed_trades?.length ?? 0).toString()} trades</span>
          </div>

          <div className={styles.table}>
            <div className={styles.thead}>
              <span>Time</span>
              <span>Symbol</span>
              <span>Side</span>
              <span className={styles.right}>PnL</span>
            </div>
            {filteredTrades.map((t) => {
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
            {!loading && filteredTrades.length === 0 ? <div className={styles.msg}>No trades.</div> : null}
          </div>
        </div>
      </div>
    </>
  );
}
