import { useEffect, useMemo, useState } from "react";

import { Seo } from "../../components/common/Seo";
import styles from "../../styles/dashboard.module.css";

const KEY = "wbc.telegram.settings";

type Settings = {
  botToken: string;
  chatIds: string;
  notifyMt5: boolean;
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { botToken: "", chatIds: "", notifyMt5: false };
    const p = JSON.parse(raw) as Partial<Settings>;
    return {
      botToken: typeof p.botToken === "string" ? p.botToken : "",
      chatIds: typeof p.chatIds === "string" ? p.chatIds : "",
      notifyMt5: Boolean(p.notifyMt5),
    };
  } catch {
    return { botToken: "", chatIds: "", notifyMt5: false };
  }
}

function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

type Mt5Event = { type?: string; ts?: number; data?: unknown } | Record<string, unknown>;

export function DashboardTelegram() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [events, setEvents] = useState<Mt5Event[]>([]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!settings.notifyMt5) return;
    let es: EventSource | null = null;
    try {
      es = new EventSource("https://mt5.wongbantercapital.com/events");
      es.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data) as Mt5Event;
          setEvents((cur) => [parsed, ...cur].slice(0, 12));
        } catch {
          return;
        }
      };
      es.onerror = () => {
        try {
          es?.close();
        } catch {
          return;
        }
      };
    } catch {
      return;
    }
    return () => {
      try {
        es?.close();
      } catch {
        return;
      }
    };
  }, [settings.notifyMt5]);

  const chatIdList = useMemo(() => {
    return settings.chatIds
      .split(/[,\n]/g)
      .map((x) => x.trim())
      .filter(Boolean);
  }, [settings.chatIds]);

  const send = async () => {
    setStatus(null);
    const token = settings.botToken.trim();
    if (!token) {
      setStatus("Bot token wajib diisi.");
      return;
    }
    if (!chatIdList.length) {
      setStatus("Chat ID wajib diisi (bisa lebih dari 1, pisahkan koma).");
      return;
    }
    const text = msg.trim();
    if (!text) {
      setStatus("Pesan tidak boleh kosong.");
      return;
    }
    try {
      const res = await fetch("/api/telegram_send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, chatIds: chatIdList, text }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok !== true) {
        setStatus(data.error || "Gagal mengirim pesan.");
        return;
      }
      setStatus("Pesan terkirim.");
      setMsg("");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Network error");
    }
  };

  return (
    <>
      <Seo title="Telegram Integration — WongBanter Dashboard" description="Atur bot Telegram & notifikasi." />

      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Telegram Integration</div>
          <div className={styles.pageSub}>Konfigurasi bot, kirim pesan, dan lihat notifikasi realtime.</div>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <div className={`${styles.card} ${styles.span6}`}>
          <div className={styles.k}>Bot Settings</div>

          <label className={styles.field}>
            <span className={styles.labelText}>Bot Token</span>
            <input
              className={styles.input}
              value={settings.botToken}
              onChange={(e) => setSettings((s) => ({ ...s, botToken: e.target.value }))}
              placeholder="123456:ABCDEF..."
            />
          </label>

          <label className={styles.field}>
            <span className={styles.labelText}>Chat ID (1 atau banyak, pisahkan koma)</span>
            <input
              className={styles.input}
              value={settings.chatIds}
              onChange={(e) => setSettings((s) => ({ ...s, chatIds: e.target.value }))}
              placeholder="6470089932, 123456789"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.labelText}>Realtime MT5 notifications</span>
            <select
              className={styles.input}
              value={settings.notifyMt5 ? "on" : "off"}
              onChange={(e) => setSettings((s) => ({ ...s, notifyMt5: e.target.value === "on" }))}
            >
              <option value="off">Off</option>
              <option value="on">On</option>
            </select>
          </label>

          <div className={styles.msg}>
            Token disimpan lokal di browser. Untuk production yang lebih aman, pindahkan token ke env server dan jangan simpan di client.
          </div>
        </div>

        <div className={`${styles.card} ${styles.span6}`}>
          <div className={styles.k}>Send Message</div>
          <label className={styles.field}>
            <span className={styles.labelText}>Message</span>
            <textarea className={styles.textarea} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Tulis pesan..." />
          </label>

          <div className={styles.row} style={{ marginTop: 10 }}>
            <button className={styles.btn} type="button" onClick={send}>
              Send
            </button>
            {status ? (
              <span className={`${styles.msg} ${status === "Pesan terkirim." ? styles.ok : styles.err}`}>{status}</span>
            ) : null}
          </div>
        </div>

        <div className={`${styles.card} ${styles.span12}`}>
          <div className={styles.row}>
            <div>
              <div className={styles.k}>Realtime Feed</div>
              <div className={styles.pageSub}>Event MT5 via SSE (`/events`).</div>
            </div>
            <span className={styles.pill}>{settings.notifyMt5 ? "Listening" : "Off"}</span>
          </div>

          <div className={styles.table}>
            <div className={styles.thead}>
              <span>Type</span>
              <span>Time</span>
              <span className={styles.right}>Payload</span>
              <span className={styles.right}>—</span>
            </div>
            {events.map((e, i) => {
              const type = typeof e.type === "string" ? e.type : "event";
              const ts = typeof e.ts === "number" ? new Date(e.ts * 1000).toLocaleString("id-ID", { hour12: false }) : "—";
              const raw = JSON.stringify(e).slice(0, 1200);
              return (
                <div key={i} className={styles.trow}>
                  <span className={styles.mono}>{type}</span>
                  <span className={styles.mono} style={{ color: "rgba(255,255,255,0.66)" }}>
                    {ts}
                  </span>
                  <span className={`${styles.mono} ${styles.right}`} style={{ gridColumn: "span 2", color: "rgba(255,255,255,0.7)" }}>
                    {raw}
                  </span>
                </div>
              );
            })}
            {events.length === 0 ? <div className={styles.msg}>No events yet.</div> : null}
          </div>
        </div>
      </div>
    </>
  );
}
