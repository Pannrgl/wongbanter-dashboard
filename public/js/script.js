const el = (id) => document.getElementById(id);

const dot = el("dot");
const statusText = el("statusText");
const brandSub = el("brandSub");
const metaLine = el("metaLine");

const mt5Dot = el("mt5Dot");
const mt5Text = el("mt5Text");
const wsDot = el("wsDot");
const wsText = el("wsText");
const pingDot = el("pingDot");
const pingText = el("pingText");

const kBalance = el("kBalance");
const kEquity = el("kEquity");
const kFloat = el("kFloat");
const kToday = el("kToday");
const kWinrate = el("kWinrate");
const kTrades = el("kTrades");
const kPF = el("kPF");
const kFree = el("kFree");
const kLevel = el("kLevel");
const kLev = el("kLev");

const openList = el("openList");
const closedList = el("closedList");
const openCount = el("openCount");
const closedCount = el("closedCount");
const calendar = el("calendar");
const calTitle = el("calTitle");
const piTitle = el("piTitle");
const piSub = el("piSub");
const piGrowth = el("piGrowth");
const piGrowthPct = el("piGrowthPct");
const piMonth = el("piMonth");
const piMonthPct = el("piMonthPct");
const piDay = el("piDay");
const piDayPct = el("piDayPct");
const piWR = el("piWR");
const piWRCue = el("piWRCue");
const piPF2 = el("piPF2");
const piPFCue = el("piPFCue");
const piDD = el("piDD");
const piPulse = el("piPulse");
const piSession = el("piSession");
const piConn = el("piConn");
const piSmartUpdated = el("piSmartUpdated");
const piSmartGrid = el("piSmartGrid");
const piActTitle = el("piActTitle");
const piTimeline = el("piTimeline");
const piDailyTitle = el("piDailyTitle");
const historySearch = el("historySearch");
const openSearch = el("openSearch");

const spark = el("spark");
const line = el("line");
const area = el("area");
const pulseSub = el("pulseSub");
const equityChartEl = el("equityChart");
const dailyChartEl = el("dailyChart");
const piGrowthChartEl = el("piGrowthChart");

const radarUpdated = el("radarUpdated");
const radarMoversMeta = el("radarMoversMeta");
const radarMovers = el("radarMovers");
const radarRiskText = el("radarRiskText");
const radarRiskBar = el("radarRiskBar");
const radarML = el("radarML");
const radarFM = el("radarFM");
const radarEX = el("radarEX");
const radarFocusMeta = el("radarFocusMeta");
const radarFocus = el("radarFocus");

let motion = true;
let stateCache = null;
let currency = "";
let selectedDay = null;
let liveOrdersToday = null;
let ws = null;
let pingMs = null;
let sse = null;
let wsMode = "offline";
let wsEverConnected = false;
let wsErrorCount = 0;
let lastSyncAt = 0;
let lastSyncLabel = "—";
let mt5Status = "unknown";
let wsStatus = "unknown";
let timelineItems = [];

const openNodes = new Map();
let lastEquityPointAt = 0;
let equitySeries = [];
let equityChart = null;
let dailyChart = null;
let piGrowthChart = null;
let lastEquityPeak = null;
let lastRiskState = null;

function setStatus(ok, text) {
  dot.classList.remove("ok", "bad");
  dot.classList.add(ok ? "ok" : "bad");
  statusText.textContent = text;
}

function setChip(dotEl, textEl, mode, text) {
  dotEl.classList.remove("ok", "bad", "idle");
  dotEl.classList.add(mode);
  textEl.textContent = text;
}

function nowStamp() {
  const d = new Date();
  return d.toLocaleString(undefined, { hour12: false });
}

function shortTime(tsMs) {
  const d = new Date(tsMs);
  return d.toLocaleTimeString(undefined, { hour12: false });
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function fmtNum(v, digits = 2) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function fmtMoney(v) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${fmtNum(n, 2)}${currency ? ` ${currency}` : ""}`;
}

function fmtTs(sec) {
  if (!sec) return "—";
  const d = new Date(Number(sec) * 1000);
  return d.toLocaleString(undefined, { hour12: false });
}

function numFromText(txt) {
  if (!txt) return null;
  const raw = String(txt).replace(/[^\d\.\-]/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function animateNumber(elNode, nextText, nextValue, color) {
  if (!motion) {
    elNode.textContent = nextText;
    if (color) elNode.style.color = color;
    return;
  }
  const prev = numFromText(elNode.dataset.v);
  const to = Number.isFinite(nextValue) ? nextValue : null;
  if (to === null) {
    elNode.textContent = nextText;
    elNode.dataset.v = "";
    if (color) elNode.style.color = color;
    return;
  }
  const from = Number.isFinite(prev) ? prev : to;
  const t0 = performance.now();
  const dur = 340;
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    const v = from + (to - from) * (1 - Math.pow(1 - p, 3));
    elNode.textContent = nextText.includes(currency) ? `${fmtNum(v, 2)}${currency ? ` ${currency}` : ""}` : fmtNum(v, 2);
    if (p < 1) requestAnimationFrame(step);
    else {
      elNode.textContent = nextText;
      elNode.dataset.v = String(to);
      if (color) elNode.style.color = color;
    }
  };
  requestAnimationFrame(step);
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

async function checkHealth() {
  const urls = ["/health", "/api/health"];
  for (const url of urls) {
    try {
      const t0 = performance.now();
      const res = await fetch(url, { cache: "no-store" });
      const t1 = performance.now();
      const data = await res.json().catch(() => ({}));
      if (data && data.ok) {
        setStatus(true, "Online");
        brandSub.textContent = "Dashboard live • MT5 realtime";
        metaLine.textContent = `${nowStamp()} • ${location.host} • ${Math.round(t1 - t0)} ms`;
        return;
      }
    } catch {}
  }
  setStatus(false, "Offline");
  brandSub.textContent = "Dashboard offline • reconnecting";
  metaLine.textContent = `${nowStamp()} • ${location.host}`;
}

function randomWalk(n) {
  let v = 0.5;
  const out = [];
  for (let i = 0; i < n; i++) {
    v += (Math.random() - 0.5) * 0.12;
    v = Math.max(0.08, Math.min(0.92, v));
    out.push(v);
  }
  return out;
}

function renderSpark(values) {
  const w = 420;
  const h = 220;
  const padX = 14;
  const padY = 22;
  const dx = (w - padX * 2) / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = padX + i * dx;
    const y = padY + (1 - v) * (h - padY * 2);
    return [x, y];
  });
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
  const lastX = pts[pts.length - 1][0];
  const dArea = `${d} L ${lastX.toFixed(2)} ${(h - 10).toFixed(2)} L ${padX.toFixed(2)} ${(h - 10).toFixed(2)} Z`;
  line.setAttribute("d", d);
  area.setAttribute("d", dArea);
}

function tickSpark() {
  if (!motion) return;
  if (equitySeries.length >= 4) {
    const ys = equitySeries.map((p) => Number(p.y)).filter((n) => Number.isFinite(n));
    if (ys.length >= 4) {
      const min = Math.min(...ys);
      const max = Math.max(...ys);
      const span = Math.max(1e-9, max - min);
      const norm = ys.slice(-26).map((y) => (y - min) / span);
      renderSpark(norm);
      return;
    }
  }
  renderSpark(randomWalk(26));
}

function tradeSideBadge(side) {
  if (side === "BUY") return "buy";
  if (side === "SELL") return "sell";
  return "";
}

function pnlClass(pnl) {
  if (pnl === null || pnl === undefined) return "";
  const n = Number(pnl);
  if (!Number.isFinite(n)) return "";
  if (n > 0) return "pos";
  if (n < 0) return "neg";
  return "";
}

function renderTrade(item, mode) {
  const elTrade = document.createElement("div");
  elTrade.className = "trade";

  const side = item.side || "—";
  const sideClass = tradeSideBadge(side);
  const profit = item.profit;
  const pc = pnlClass(profit);
  const pnlValue = profit === null || profit === undefined || !Number.isFinite(Number(profit)) ? "—" : fmtMoney(profit);
  const pnlTag = pc === "pos" ? "PROFIT" : pc === "neg" ? "LOSS" : "—";
  const pnlBadge = pc === "pos" ? "pnlpos" : pc === "neg" ? "pnlneg" : "";

  const entry = fmtNum(item.price_open ?? item.price, 3);
  const close = mode === "closed" ? fmtNum(item.close_price, 3) : "—";
  const sl = fmtNum(item.sl, 3);
  const tp = fmtNum(item.tp, 3);

  const foot =
    mode === "open"
      ? `Open • ${fmtTs(item.time)} • ${pnlValue}`
      : `Closed • ${fmtTs(item.close_time)} • ${pnlValue}`;

  elTrade.innerHTML = `
    <div class="trade-top">
      <div class="sym">${item.symbol || "—"}</div>
      <div class="right">
        <div class="badge ${sideClass}">${side}</div>
        <div class="badge ${pnlBadge}">${pnlTag}</div>
        <div class="mono pnl ${pc}" data-role="pnl">${pnlValue}</div>
      </div>
    </div>
    <div class="trade-grid">
      <div class="kv">
        <div class="k">Entry</div>
        <div class="v mono">${entry}</div>
      </div>
      <div class="kv">
        <div class="k">${mode === "closed" ? "Close" : "PnL (Floating)"}</div>
        <div class="v mono" data-role="pnlCell">${mode === "closed" ? close : pnlValue}</div>
      </div>
      <div class="kv">
        <div class="k">SL</div>
        <div class="v mono" data-role="sl">${sl}</div>
      </div>
      <div class="kv">
        <div class="k">TP</div>
        <div class="v mono" data-role="tp">${tp}</div>
      </div>
    </div>
    <div class="foot mono">${foot}</div>
  `;
  return elTrade;
}

function setList(container, items, mode) {
  container.innerHTML = "";
  if (!items || items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = mode === "closed" ? "Belum ada posisi yang close" : "Belum ada posisi terbuka";
    container.appendChild(empty);
    return;
  }
  const limit = mode === "closed" ? 120 : 80;
  for (const it of items.slice(0, limit)) container.appendChild(renderTrade(it, mode));
}

function updateOpenNode(node, item) {
  const profit = item.profit;
  const pc = pnlClass(profit);
  const pnlValue = profit === null || profit === undefined || !Number.isFinite(Number(profit)) ? "—" : fmtMoney(profit);
  const pnlEl = node.querySelector('[data-role="pnl"]');
  const pnlCell = node.querySelector('[data-role="pnlCell"]');
  const slEl = node.querySelector('[data-role="sl"]');
  const tpEl = node.querySelector('[data-role="tp"]');
  if (pnlEl) {
    pnlEl.textContent = pnlValue;
    pnlEl.classList.remove("pos", "neg");
    if (pc) pnlEl.classList.add(pc);
  }
  if (pnlCell) pnlCell.textContent = pnlValue;
  if (slEl) slEl.textContent = fmtNum(item.sl, 3);
  if (tpEl) tpEl.textContent = fmtNum(item.tp, 3);
  if (Number.isFinite(Number(profit))) {
    node.classList.remove("glowpos", "glowneg");
    if (Number(profit) > 0) node.classList.add("glowpos");
    if (Number(profit) < 0) node.classList.add("glowneg");
  }
}

function syncOpenPositions(items) {
  const anchor = (() => {
    try {
      const rootRect = openList.getBoundingClientRect();
      for (const node of openList.children) {
        const pid = node && node.dataset ? node.dataset.pid : "";
        if (!pid) continue;
        const r = node.getBoundingClientRect();
        if (r.bottom > rootRect.top + 6) return { pid, top: r.top };
      }
    } catch {}
    return null;
  })();

  const list = Array.isArray(items) ? items.slice() : [];
  list.sort((a, b) => Number(b.time || 0) - Number(a.time || 0));
  const nextIds = new Set();
  const frag = document.createDocumentFragment();
  for (const it of list.slice(0, 120)) {
    const pid = String(it.position_id || "");
    if (!pid) continue;
    nextIds.add(pid);
    let node = openNodes.get(pid);
    if (!node) {
      node = renderTrade(it, "open");
      node.dataset.pid = pid;
      node.classList.add("enter");
      openNodes.set(pid, node);
      requestAnimationFrame(() => node.classList.remove("enter"));
    } else {
      updateOpenNode(node, it);
    }
    frag.appendChild(node);
  }
  for (const [pid, node] of openNodes.entries()) {
    if (nextIds.has(pid)) continue;
    openNodes.delete(pid);
    node.classList.add("exit");
    setTimeout(() => node.remove(), 220);
  }
  openList.innerHTML = "";
  if (frag.childNodes.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Belum ada posisi terbuka";
    openList.appendChild(empty);
  } else {
    openList.appendChild(frag);
  }

  if (anchor && anchor.pid) {
    try {
      const node = openNodes.get(anchor.pid);
      if (node) {
        const nowTop = node.getBoundingClientRect().top;
        const delta = nowTop - anchor.top;
        if (Math.abs(delta) > 1) openList.scrollTop += delta;
      }
    } catch {}
  }
}

function dayKeyFromTs(sec) {
  const d = new Date(Number(sec) * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function buildCalendar(closedTrades, daily) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = (first.getDay() + 6) % 7;
  const daysInMonth = last.getDate();

  const monthName = now.toLocaleString(undefined, { month: "long", year: "numeric" });
  calTitle.textContent = monthName;

  const dayPnL = new Map();
  if (Array.isArray(daily) && daily.length > 0) {
    for (const r of daily) {
      if (!r || !r.date) continue;
      const p = Number(r.pnl);
      dayPnL.set(String(r.date), Number.isFinite(p) ? p : 0);
    }
  } else {
    for (const t of closedTrades || []) {
      const k = dayKeyFromTs(t.close_time);
      const prev = dayPnL.get(k) || 0;
      const p = Number(t.profit);
      dayPnL.set(k, prev + (Number.isFinite(p) ? p : 0));
    }
  }

  calendar.innerHTML = "";
  const dows = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  for (const d of dows) {
    const x = document.createElement("div");
    x.className = "dow mono";
    x.textContent = d;
    calendar.appendChild(x);
  }

  for (let i = 0; i < startDow; i++) {
    const pad = document.createElement("div");
    pad.className = "day muted";
    pad.innerHTML = `<div class="d mono"> </div><div class="p mono"> </div>`;
    calendar.appendChild(pad);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const pnl = dayPnL.get(key) || 0;
    const cell = document.createElement("div");
    cell.className = "day";
    if (pnl > 0) cell.classList.add("pos");
    if (pnl < 0) cell.classList.add("neg");
    if (selectedDay === key) cell.classList.add("sel");
    cell.innerHTML = `
      <div class="d mono">${d}</div>
      <div class="p mono">${pnl === 0 ? "—" : fmtMoney(pnl)}</div>
    `;
    cell.addEventListener("click", () => {
      if (selectedDay === key) selectedDay = null;
      else selectedDay = key;
      applyUI();
    });
    calendar.appendChild(cell);
  }
}

function applyUI() {
  if (!stateCache) return;
  const open = stateCache.open_positions || [];
  const daily = stateCache.daily || [];

  setOpenFiltered(open);
  const closed = stateCache.closed_trades || [];
  setClosedFiltered(closed);
  buildCalendar(closed, daily);
  syncTimelineFromSnapshot(stateCache.events || []);
  renderPi();
  renderRadar();
}

function applyPortfolio(account, stats) {
  if (account) {
    currency = account.currency || "";
    const bal = Number(account.balance);
    const eq = Number(account.equity);
    const floatPnl = Number.isFinite(bal) && Number.isFinite(eq) ? eq - bal : null;
    const balText = Number.isFinite(bal) ? `${fmtNum(bal, 2)}${currency ? ` ${currency}` : ""}` : "—";
    const eqText = Number.isFinite(eq) ? `${fmtNum(eq, 2)}${currency ? ` ${currency}` : ""}` : "—";
    animateNumber(kBalance, balText, bal, null);
    animateNumber(kEquity, eqText, eq, null);
    const fpText = floatPnl === null ? "—" : fmtMoney(floatPnl);
    const fpColor = floatPnl === null ? "var(--text)" : floatPnl >= 0 ? "var(--good)" : "var(--bad)";
    animateNumber(kFloat, fpText, floatPnl, fpColor);
    const free = account.margin_free;
    const freeText = free === null || free === undefined ? "—" : `${fmtNum(free, 2)}${currency ? ` ${currency}` : ""}`;
    animateNumber(kFree, freeText, Number(free), null);
    const ml = account.margin_level;
    kLevel.textContent = ml === null || ml === undefined ? "—" : `${fmtNum(ml, 1)}%`;
    kLev.textContent = account.leverage ? `1:${account.leverage}` : "—";
    if (Number.isFinite(eq)) pushEquityPoint(eq);
  }
  if (stats) {
    const net = Number(stats.net);
    const netText = Number.isFinite(net) ? fmtMoney(net) : "—";
    const netColor = Number.isFinite(net) ? (net >= 0 ? "var(--good)" : "var(--bad)") : "var(--text)";
    animateNumber(kToday, netText, net, netColor);
    const liveOrdersFromState = stateCache && stateCache.live ? Number(stateCache.live.orders_today) : null;
    const live = Number.isFinite(liveOrdersToday) ? liveOrdersToday : liveOrdersFromState;
    const fallback = stats.orders_filled ?? stats.deals_in ?? stats.trades ?? "—";
    kTrades.textContent = Number.isFinite(live) ? String(live) : String(fallback);
    kWinrate.textContent =
      stats.winrate === null || stats.winrate === undefined ? "—" : `${fmtNum(stats.winrate, 1)}%`;
    if (stats.profit_factor_infinite) kPF.textContent = "∞";
    else kPF.textContent = stats.profit_factor === null || stats.profit_factor === undefined ? "—" : fmtNum(stats.profit_factor, 2);
  }
}

function applyState(s) {
  stateCache = s;
  applyPortfolio(s.account, s.stats);
  if (s.account && s.account.login && s.account.server) {
    brandSub.textContent = `Account ${s.account.login} • ${s.account.server}`;
  }
  if (Array.isArray(s.daily)) applyDailyChart(s.daily);
  if (Array.isArray(s.events)) syncTimelineFromSnapshot(s.events);
  applyUI();
  renderPi();
}

function setClosedFiltered(all) {
  const q = (historySearch && historySearch.value ? historySearch.value : "").trim().toUpperCase();
  const items = Array.isArray(all) ? all : [];
  const filtered =
    !q
      ? items
      : items.filter((t) => String(t.symbol || "").toUpperCase().includes(q) || String(t.side || "").toUpperCase().includes(q));
  setList(closedList, filtered, "closed");
  closedCount.textContent = `${filtered.length} trades`;
}

function setOpenFiltered(all) {
  const q = (openSearch && openSearch.value ? openSearch.value : "").trim().toUpperCase();
  const items = Array.isArray(all) ? all : [];
  const filtered =
    !q
      ? items
      : items.filter((t) => String(t.symbol || "").toUpperCase().includes(q) || String(t.side || "").toUpperCase().includes(q));
  syncOpenPositions(filtered);
  openCount.textContent = q ? `${filtered.length} / ${items.length} open` : `${items.length} open`;
}

function initCharts() {
  if (typeof ApexCharts !== "function") return;
  const isMobile = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 520px)").matches;
  const hPulse = isMobile ? 190 : 220;
  const hDaily = isMobile ? 180 : 200;
  const hGrowth = isMobile ? 220 : 260;
  if (!equityChart && equityChartEl) {
    const opts = {
      chart: {
        type: "area",
        height: hPulse,
        toolbar: { show: false },
        animations: { enabled: true, easing: "linear", speed: 180 },
        zoom: { enabled: false },
        background: "transparent",
        foreColor: "rgba(255,255,255,.72)",
      },
      stroke: { curve: "smooth", width: 2 },
      fill: { type: "gradient", gradient: { shadeIntensity: 0.35, opacityFrom: 0.35, opacityTo: 0.02 } },
      grid: { borderColor: "rgba(255,255,255,.08)", strokeDashArray: 6 },
      dataLabels: { enabled: false },
      xaxis: { type: "datetime", labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { labels: { show: false } },
      tooltip: { theme: "dark" },
      series: [{ name: "Equity", data: [] }],
      colors: ["#2ee9ff"],
    };
    equityChart = new ApexCharts(equityChartEl, opts);
    equityChart.render();
    equityChartEl.style.display = "block";
  }
  if (!dailyChart && dailyChartEl) {
    const opts = {
      chart: {
        type: "bar",
        height: hDaily,
        toolbar: { show: false },
        animations: { enabled: true, easing: "easeinout", speed: 200 },
        background: "transparent",
        foreColor: "rgba(255,255,255,.72)",
      },
      plotOptions: { bar: { borderRadius: 6, columnWidth: "70%" } },
      grid: { borderColor: "rgba(255,255,255,.08)", strokeDashArray: 6 },
      dataLabels: { enabled: false },
      xaxis: { categories: [], labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { labels: { show: false } },
      tooltip: { theme: "dark" },
      series: [{ name: "Daily PnL", data: [] }],
      colors: ["#7c5cff"],
    };
    dailyChart = new ApexCharts(dailyChartEl, opts);
    dailyChart.render();
    dailyChartEl.style.display = "block";
  }

  if (!piGrowthChart && piGrowthChartEl) {
    const opts = {
      chart: {
        type: "area",
        height: hGrowth,
        toolbar: { show: false },
        animations: { enabled: true, easing: "linear", speed: 220 },
        zoom: { enabled: false },
        background: "transparent",
        foreColor: "rgba(255,255,255,.72)",
      },
      stroke: { curve: "smooth", width: 2.4 },
      fill: { type: "gradient", gradient: { shadeIntensity: 0.45, opacityFrom: 0.42, opacityTo: 0.02 } },
      grid: { borderColor: "rgba(255,255,255,.08)", strokeDashArray: 6 },
      dataLabels: { enabled: false },
      xaxis: { type: "datetime", labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { labels: { show: false } },
      tooltip: { theme: "dark" },
      series: [{ name: "Equity", data: [] }],
      colors: ["#2ee9ff"],
    };
    piGrowthChart = new ApexCharts(piGrowthChartEl, opts);
    piGrowthChart.render();
    piGrowthChartEl.style.display = "block";
  }
}

function pushEquityPoint(eq) {
  const now = Date.now();
  if (now - lastEquityPointAt < 450) return;
  lastEquityPointAt = now;
  equitySeries.push({ x: now, y: Number(eq) });
  equitySeries = equitySeries.slice(-240);
  if (equityChart) equityChart.updateSeries([{ name: "Equity", data: equitySeries }], false);
  if (piGrowthChart) piGrowthChart.updateSeries([{ name: "Equity", data: equitySeries }], false);

  const n = Number(eq);
  if (Number.isFinite(n)) {
    const prev = equitySeries.length >= 2 ? Number(equitySeries[equitySeries.length - 2].y) : null;
    const d = prev === null || !Number.isFinite(prev) ? null : n - prev;
    if (pulseSub) {
      const sign = d === null ? "" : d >= 0 ? "+" : "";
      pulseSub.textContent = `${fmtNum(n, 2)}${currency ? ` ${currency}` : ""}${d === null ? "" : ` • ${sign}${fmtNum(d, 2)}`}`;
      pulseSub.style.color = d === null ? "rgba(255,255,255,.72)" : d >= 0 ? "var(--good)" : "var(--bad)";
    }
    if (lastEquityPeak === null || n > lastEquityPeak * 1.0005) {
      lastEquityPeak = n;
      pushTimelineEvent("equity_high", { equity: n });
    }
  }
}

function applyDailyChart(daily) {
  if (!dailyChart) return;
  const rows = Array.isArray(daily) ? daily.slice(-30) : [];
  const cats = rows.map((r) => String(r.date || ""));
  const data = rows.map((r) => Number(r.pnl) || 0);
  dailyChart.updateOptions({ xaxis: { categories: cats } }, false, false);
  dailyChart.updateSeries([{ name: "Daily PnL", data }], false);
}

async function refreshState() {
  try {
    const { data } = await fetchJson("/state");
    if (data && data.ok) applyState(data);
  } catch {}
}

function sumDaily(rows, days) {
  if (!Array.isArray(rows) || rows.length === 0) return 0;
  return rows.slice(-days).reduce((a, r) => a + (Number(r.pnl) || 0), 0);
}

function aggClosedBySymbol(closed) {
  const by = new Map();
  for (const t of closed || []) {
    const sym = String(t.symbol || "");
    if (!sym) continue;
    const cur = by.get(sym) || { profit: 0, count: 0 };
    cur.profit += Number(t.profit) || 0;
    cur.count += 1;
    by.set(sym, cur);
  }
  return by;
}

function computeRRFromPositions(open) {
  const vals = [];
  for (const p of open || []) {
    const side = String(p.side || "");
    const entry = Number(p.price_open);
    const sl = Number(p.sl);
    const tp = Number(p.tp);
    if (!Number.isFinite(entry) || !Number.isFinite(sl) || !Number.isFinite(tp)) continue;
    const risk = side === "SELL" ? Math.abs(sl - entry) : Math.abs(entry - sl);
    const reward = side === "SELL" ? Math.abs(entry - tp) : Math.abs(tp - entry);
    if (risk <= 0 || reward <= 0) continue;
    vals.push(reward / risk);
  }
  if (!vals.length) return null;
  return vals.reduce((a, v) => a + v, 0) / vals.length;
}

function computeDrawdownPct() {
  const ys = equitySeries.map((p) => Number(p.y)).filter((n) => Number.isFinite(n));
  if (ys.length < 3) return null;
  let peak = ys[0];
  let cur = ys[ys.length - 1];
  for (const y of ys) peak = Math.max(peak, y);
  if (peak <= 0) return null;
  return ((peak - cur) / peak) * 100;
}

function computeVolatilityLevel() {
  const ys = equitySeries.map((p) => Number(p.y)).filter((n) => Number.isFinite(n));
  if (ys.length < 10) return { label: "LOW", score: 0.12 };
  const diffs = ys.slice(-40).map((y, i, arr) => (i === 0 ? 0 : y - arr[i - 1])).slice(1);
  const mean = diffs.reduce((a, v) => a + v, 0) / diffs.length;
  const v = Math.sqrt(diffs.reduce((a, x) => a + (x - mean) * (x - mean), 0) / diffs.length);
  const base = Math.max(1e-9, Math.abs(mean) + 1);
  const score = clamp(v / base, 0, 2);
  const label = score < 0.35 ? "LOW" : score < 0.85 ? "MED" : "HIGH";
  return { label, score };
}

function computeSession() {
  const h = new Date().getHours();
  if (h >= 7 && h < 16) return "LONDON";
  if (h >= 16 && h < 23) return "NEW YORK";
  return "ASIA";
}

function setPiText(elNode, text, mode) {
  if (!elNode) return;
  elNode.textContent = text;
  if (mode === "pos") elNode.style.color = "var(--good)";
  else if (mode === "neg") elNode.style.color = "var(--bad)";
  else elNode.style.color = "var(--text)";
}

function renderPi() {
  if (!stateCache) return;
  const account = stateCache.account || null;
  const stats = stateCache.stats || null;
  const daily = stateCache.daily || [];
  const closed = stateCache.closed_trades || [];
  const open = stateCache.open_positions || [];

  const bal = account ? Number(account.balance) : null;
  const eq = account ? Number(account.equity) : null;

  const totalGrowth = sumDaily(daily, 365);
  const month = sumDaily(daily, 30);
  const day = stats ? Number(stats.net) : sumDaily(daily, 1);

  const growthPct = Number.isFinite(bal) && bal !== 0 ? (totalGrowth / bal) * 100 : null;
  const monthPct = Number.isFinite(bal) && bal !== 0 ? (month / bal) * 100 : null;
  const dayPct = Number.isFinite(bal) && bal !== 0 ? (day / bal) * 100 : null;

  if (piTitle) piTitle.textContent = `Updated • ${nowStamp()}`;
  if (piSub) {
    const a = account && account.login ? `Account ${account.login}` : "Account";
    const s = account && account.server ? `${account.server}` : "—";
    const e = Number.isFinite(eq) ? `${fmtNum(eq, 2)}${currency ? ` ${currency}` : ""}` : "—";
    piSub.textContent = `${a} • ${s} • Equity ${e}`;
  }

  if (piGrowth) animateNumber(piGrowth, fmtMoney(totalGrowth), totalGrowth, totalGrowth >= 0 ? "var(--good)" : "var(--bad)");
  setPiText(piGrowthPct, growthPct === null ? "—" : `${fmtNum(growthPct, 2)}%`, growthPct === null ? "muted" : growthPct >= 0 ? "pos" : "neg");

  if (piMonth) animateNumber(piMonth, fmtMoney(month), month, month >= 0 ? "var(--good)" : "var(--bad)");
  setPiText(piMonthPct, monthPct === null ? "—" : `${fmtNum(monthPct, 2)}%`, monthPct === null ? "muted" : monthPct >= 0 ? "pos" : "neg");

  if (piDay) animateNumber(piDay, fmtMoney(day), day, day >= 0 ? "var(--good)" : "var(--bad)");
  setPiText(piDayPct, dayPct === null ? "—" : `${fmtNum(dayPct, 2)}%`, dayPct === null ? "muted" : dayPct >= 0 ? "pos" : "neg");

  const wr = stats && stats.winrate !== null && stats.winrate !== undefined ? Number(stats.winrate) : null;
  if (piWR) piWR.textContent = wr === null || !Number.isFinite(wr) ? "—" : `${fmtNum(wr, 1)}%`;
  if (piWRCue) piWRCue.textContent = wr === null ? "—" : wr >= 55 ? "EDGE ↑" : wr >= 45 ? "STABLE" : "EDGE ↓";

  const pf = stats && stats.profit_factor_infinite ? Infinity : stats ? Number(stats.profit_factor) : null;
  if (piPF2) piPF2.textContent = pf === Infinity ? "∞" : pf === null || !Number.isFinite(pf) ? "—" : fmtNum(pf, 2);
  if (piPFCue) piPFCue.textContent = pf === Infinity ? "DOMINANT" : pf === null ? "—" : pf >= 1.6 ? "STRONG" : pf >= 1.2 ? "OK" : "WEAK";

  const dd = computeDrawdownPct();
  if (piDD) piDD.textContent = dd === null ? "Drawdown —" : `Drawdown ${fmtNum(dd, 2)}%`;
  const riskState = dd === null ? "—" : dd < 2 ? "STABLE" : dd < 6 ? "WATCH" : "RISK";
  if (riskState !== lastRiskState && riskState !== "—") {
    lastRiskState = riskState;
    pushTimelineEvent("risk_state", { state: riskState, dd });
  }

  const vol = computeVolatilityLevel();
  if (piPulse) piPulse.textContent = `${vol.label} VOL`;
  if (piSession) piSession.textContent = computeSession();
  if (piConn) piConn.textContent = `${mt5Status.toUpperCase()} • ${wsMode.toUpperCase()}`;

  if (piSmartUpdated) piSmartUpdated.textContent = `Updated • ${nowStamp()}`;
  if (piDailyTitle) piDailyTitle.textContent = `Rolling 30D • ${nowStamp()}`;

  if (piSmartGrid) {
    const by = aggClosedBySymbol(closed);
    let bestSym = null;
    let bestP = null;
    let mostSym = null;
    let mostN = 0;
    for (const [sym, v] of by.entries()) {
      if (bestP === null || v.profit > bestP) {
        bestP = v.profit;
        bestSym = sym;
      }
      if (v.count > mostN) {
        mostN = v.count;
        mostSym = sym;
      }
    }

    const exposure = (open || []).reduce((a, p) => {
      const vol2 = Number(p.volume);
      const px = Number(p.price_open);
      if (!Number.isFinite(vol2) || !Number.isFinite(px)) return a;
      return a + Math.abs(vol2 * px);
    }, 0);

    const rr = computeRRFromPositions(open);

    let streak = 0;
    const sortedClosed = (closed || []).slice().sort((a, b) => Number(b.close_time || 0) - Number(a.close_time || 0));
    for (const t of sortedClosed.slice(0, 50)) {
      const p = Number(t.profit);
      if (!Number.isFinite(p)) continue;
      if (p > 0) streak += 1;
      else break;
    }

    const dd2 = computeDrawdownPct();

    piSmartGrid.innerHTML = `
      <div class="pi-card">
        <div class="k">Best Performing</div>
        <div class="v mono">${bestSym || "—"}</div>
        <div class="m mono">${bestP === null ? "—" : fmtMoney(bestP)}</div>
      </div>
      <div class="pi-card">
        <div class="k">Most Traded</div>
        <div class="v mono">${mostSym || "—"}</div>
        <div class="m mono">${mostSym ? `${mostN} trades` : "—"}</div>
      </div>
      <div class="pi-card">
        <div class="k">Risk Exposure</div>
        <div class="v mono">${exposure ? fmtNum(exposure, 2) : "—"}</div>
        <div class="m mono">${Number.isFinite(bal) && bal ? `${fmtNum((exposure / bal) * 100, 1)}% vs balance` : "—"}</div>
      </div>
      <div class="pi-card">
        <div class="k">Average RR</div>
        <div class="v mono">${rr === null ? "—" : fmtNum(rr, 2)}</div>
        <div class="m mono">${rr === null ? "Need SL/TP" : rr >= 1.5 ? "FAVORABLE" : rr >= 1.1 ? "OK" : "TIGHT"}</div>
      </div>
      <div class="pi-card">
        <div class="k">Consecutive Wins</div>
        <div class="v mono">${streak ? String(streak) : "0"}</div>
        <div class="m mono">${streak >= 3 ? "Momentum" : "Neutral"}</div>
      </div>
      <div class="pi-card">
        <div class="k">Drawdown Level</div>
        <div class="v mono">${dd2 === null ? "—" : `${fmtNum(dd2, 2)}%`}</div>
        <div class="m mono">${dd2 === null ? "—" : dd2 < 2 ? "STABLE" : dd2 < 6 ? "WATCH" : "RISK"}</div>
      </div>
    `;
  }
}

function renderRadar() {
  if (!stateCache) return;
  const account = stateCache.account || null;
  const open = stateCache.open_positions || [];
  const closed = stateCache.closed_trades || [];

  if (radarUpdated) radarUpdated.textContent = `Updated • ${nowStamp()}`;

  if (radarMovers) {
    const list = Array.isArray(open) ? open.slice() : [];
    list.sort((a, b) => Math.abs(Number(b.profit) || 0) - Math.abs(Number(a.profit) || 0));
    const top = list.slice(0, 6);
    if (radarMoversMeta) radarMoversMeta.textContent = top.length ? `${top.length} of ${list.length}` : "—";
    radarMovers.innerHTML = "";
    if (!top.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Tidak ada posisi terbuka";
      radarMovers.appendChild(empty);
    } else {
      const frag = document.createDocumentFragment();
      for (const p of top) {
        const sym = String(p.symbol || "—");
        const side = String(p.side || "—");
        const pr = Number(p.profit);
        const pnlText = Number.isFinite(pr) ? fmtMoney(pr) : "—";
        const cls = pnlClass(pr);
        const row = document.createElement("div");
        row.className = "radar-row";
        row.innerHTML = `
          <div class="l">
            <div>
              <div class="sym">${sym}</div>
              <div class="side">${side}</div>
            </div>
          </div>
          <div class="r">
            <div class="mono pnl ${cls}">${pnlText}</div>
          </div>
        `;
        frag.appendChild(row);
      }
      radarMovers.appendChild(frag);
    }
  }

  const ml = account ? Number(account.margin_level) : null;
  const fm = account ? Number(account.margin_free) : null;
  const exposure = (open || []).reduce((a, p) => {
    const vol2 = Number(p.volume);
    const px = Number(p.price_open);
    if (!Number.isFinite(vol2) || !Number.isFinite(px)) return a;
    return a + Math.abs(vol2 * px);
  }, 0);

  if (radarML) radarML.textContent = ml === null || !Number.isFinite(ml) ? "—" : `${fmtNum(ml, 1)}%`;
  if (radarFM) radarFM.textContent = fm === null || !Number.isFinite(fm) ? "—" : `${fmtNum(fm, 2)}${currency ? ` ${currency}` : ""}`;
  if (radarEX) radarEX.textContent = exposure ? fmtNum(exposure, 2) : "—";

  const ml2 = ml === null || !Number.isFinite(ml) ? null : ml;
  const riskScore = ml2 === null ? null : clamp((220 - ml2) / 200, 0, 1);
  const riskLabel = riskScore === null ? "—" : riskScore < 0.25 ? "SAFE" : riskScore < 0.6 ? "WATCH" : "DANGER";
  if (radarRiskText) radarRiskText.textContent = riskLabel;
  if (radarRiskBar) {
    const w = riskScore === null ? 0.12 : 0.12 + riskScore * 0.88;
    radarRiskBar.style.width = `${Math.round(w * 100)}%`;
    radarRiskBar.style.background =
      riskScore === null
        ? "linear-gradient(90deg,rgba(255,255,255,.22),rgba(255,255,255,.12))"
        : riskScore < 0.25
          ? "linear-gradient(90deg,rgba(70,243,164,.95),rgba(46,233,255,.9))"
          : riskScore < 0.6
            ? "linear-gradient(90deg,rgba(255,184,107,.95),rgba(46,233,255,.9))"
            : "linear-gradient(90deg,rgba(255,107,107,.95),rgba(255,184,107,.85))";
  }

  if (radarFocus) {
    const last = (closed || []).slice(0, 80);
    const by = aggClosedBySymbol(last);
    const rows = Array.from(by.entries())
      .map(([sym, v]) => ({ sym, profit: v.profit, count: v.count }))
      .sort((a, b) => b.count - a.count || b.profit - a.profit)
      .slice(0, 6);
    if (radarFocusMeta) radarFocusMeta.textContent = rows.length ? `Last ${last.length}` : "—";
    radarFocus.innerHTML = "";
    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Belum ada data trade yang cukup";
      radarFocus.appendChild(empty);
    } else {
      const frag = document.createDocumentFragment();
      for (const r of rows) {
        const row = document.createElement("div");
        row.className = "radar-row";
        row.innerHTML = `
          <div class="l">
            <div>
              <div class="sym">${r.sym}</div>
              <div class="side">${r.count} trades</div>
            </div>
          </div>
          <div class="r">
            <div class="mono pnl ${pnlClass(r.profit)}">${fmtMoney(r.profit)}</div>
          </div>
        `;
        frag.appendChild(row);
      }
      radarFocus.appendChild(frag);
    }
  }
}

function timelineModeFromProfit(p) {
  const n = Number(p);
  if (!Number.isFinite(n)) return "info";
  if (n > 0) return "pos";
  if (n < 0) return "neg";
  return "info";
}

function renderTimeline() {
  if (!piTimeline) return;
  piTimeline.innerHTML = "";
  const frag = document.createDocumentFragment();
  for (const it of timelineItems.slice(0, 10)) {
    const node = document.createElement("div");
    node.className = `pi-node ${it.mode || "info"}`;
    node.innerHTML = `
      <div class="t">${it.title}</div>
      <div class="s">${it.subtitle}</div>
      <div class="r mono">${it.right}</div>
    `;
    frag.appendChild(node);
  }
  piTimeline.appendChild(frag);
  if (piActTitle) piActTitle.textContent = `Live • ${nowStamp()}`;
}

function syncTimelineFromSnapshot(events) {
  const items = Array.isArray(events) ? events : [];
  const out = [];
  for (const ev of items.slice(0, 16)) {
    const type = String(ev && ev.type ? ev.type : "");
    const data = ev && ev.data ? ev.data : {};
    const ts = Number(ev && ev.ts ? ev.ts : 0) * 1000;
    const right = ts ? shortTime(ts) : "—";

    if (type === "closed") {
      out.push({
        title: `${data.side || "—"} ${data.symbol || "—"} closed`,
        subtitle: `PnL ${fmtMoney(data.profit)} • Close ${fmtNum(data.close_price, 3)}`,
        right,
        mode: timelineModeFromProfit(data.profit),
      });
      continue;
    }
    if (type === "order") {
      out.push({
        title: `${data.side || "—"} ${data.symbol || "—"} opened`,
        subtitle: `Entry ${fmtNum(data.price, 3)} • SL ${fmtNum(data.sl, 3)} • TP ${fmtNum(data.tp, 3)}`,
        right,
        mode: "info",
      });
      continue;
    }
    if (type === "connection") {
      const mt5 = data && data.mt5 ? String(data.mt5) : "";
      out.push({
        title: mt5 === "connected" ? "MT5 connected" : "MT5 disconnected",
        subtitle: "Connection pulse",
        right,
        mode: mt5 === "connected" ? "info" : "neg",
      });
      continue;
    }
  }
  timelineItems = out;
  renderTimeline();
}

function pushTimelineEvent(kind, payload) {
  const now = Date.now();
  const right = shortTime(now);
  let it = null;
  if (kind === "position_opened") {
    const p = payload && payload.position ? payload.position : {};
    it = { title: `${p.side || "—"} ${p.symbol || "—"} opened`, subtitle: `Entry ${fmtNum(p.price_open, 3)} • SL ${fmtNum(p.sl, 3)} • TP ${fmtNum(p.tp, 3)}`, right, mode: "info" };
  }
  if (kind === "position_closed") {
    const c = payload && payload.closed ? payload.closed : {};
    it = { title: `${c.side || "—"} ${c.symbol || "—"} closed`, subtitle: `PnL ${fmtMoney(c.profit)} • Close ${fmtNum(c.close_price, 3)}`, right, mode: timelineModeFromProfit(c.profit) };
  }
  if (kind === "position_updated") {
    const items = payload && Array.isArray(payload.positions) ? payload.positions : [];
    if (items.length) {
      const p = items[0].position || {};
      it = { title: `${p.symbol || "—"} update`, subtitle: `Floating ${fmtMoney(p.profit)} • SL ${fmtNum(p.sl, 3)} • TP ${fmtNum(p.tp, 3)}`, right, mode: timelineModeFromProfit(p.profit) };
    }
  }
  if (kind === "connection_status") {
    const mt5 = payload && payload.mt5 ? String(payload.mt5) : "";
    const wsS = payload && payload.ws ? String(payload.ws) : "";
    if (mt5) it = { title: mt5 === "connected" ? "MT5 connected" : "MT5 disconnected", subtitle: "Connection pulse", right, mode: mt5 === "connected" ? "info" : "neg" };
    if (wsS) it = { title: wsS === "connected" ? "Realtime connected" : "Realtime disconnected", subtitle: "Transport status", right, mode: wsS === "connected" ? "info" : "neg" };
  }
  if (kind === "equity_high") {
    const e = payload && payload.equity !== undefined ? Number(payload.equity) : null;
    it = { title: "Equity reached new high", subtitle: e === null || !Number.isFinite(e) ? "—" : `Equity ${fmtNum(e, 2)}${currency ? ` ${currency}` : ""}`, right, mode: "pos" };
  }
  if (kind === "risk_state") {
    const s = payload && payload.state ? String(payload.state) : "—";
    const dd2 = payload && payload.dd !== undefined ? Number(payload.dd) : null;
    const mode = s === "RISK" ? "neg" : s === "WATCH" ? "info" : "pos";
    it = { title: "Risk level update", subtitle: dd2 === null || !Number.isFinite(dd2) ? s : `${s} • Drawdown ${fmtNum(dd2, 2)}%`, right, mode };
  }
  if (!it) return;
  timelineItems.unshift(it);
  timelineItems = timelineItems.slice(0, 14);
  renderTimeline();
}

function markSync(label) {
  lastSyncAt = Date.now();
  lastSyncLabel = label || "sync";
}

function startSSE() {
  try {
    if (sse) sse.close();
  } catch {}
  sse = null;

  try {
    const es = new EventSource("/events");
    sse = es;
    wsMode = "sse";
    setChip(wsDot, wsText, "idle", "SSE syncing");

    es.addEventListener("snapshot", (e) => {
      try {
        applyState(JSON.parse(e.data));
        markSync("snapshot");
      } catch {}
    });

    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        markSync(ev.type || "event");
        if (ev.type === "connection") {
          const ok = String(ev.data?.mt5) === "connected";
          mt5Status = ok ? "connected" : "disconnected";
          setChip(mt5Dot, mt5Text, ok ? "ok" : "bad", ok ? "MT5 connected" : "MT5 disconnected");
          pushTimelineEvent("connection_status", ev.data || {});
        }
        if (ev.type === "positions") {
          stateCache = stateCache || {};
          stateCache.open_positions = ev.data || [];
          setOpenFiltered(stateCache.open_positions);
          renderPi();
        }
        if (ev.type === "history") {
          stateCache = stateCache || {};
          stateCache.closed_trades = ev.data?.closed_trades || stateCache.closed_trades || [];
          stateCache.daily = ev.data?.daily || stateCache.daily || [];
          applyDailyChart(stateCache.daily);
          applyUI();
          renderPi();
        }
        if (ev.type === "closed") refreshState();
        if (ev.type === "portfolio") applyPortfolio(ev.data?.account, ev.data?.stats);
        if (ev.type === "live" && ev.data && stateCache) {
          const n = Number(ev.data.orders_today);
          if (Number.isFinite(n)) liveOrdersToday = n;
          stateCache.live = stateCache.live || {};
          stateCache.live.orders_today = ev.data.orders_today;
          applyPortfolio(stateCache.account, stateCache.stats);
        }
      } catch {}
    };

    es.onerror = () => {
      setChip(wsDot, wsText, "bad", "SSE reconnecting…");
      setTimeout(() => refreshState(), 900);
    };

    return true;
  } catch {}
  return false;
}

function startRealtime() {
  initCharts();
  if (typeof io === "function") {
    try {
      wsErrorCount = 0;
      wsEverConnected = false;
      wsMode = "ws";
      if (sse) {
        try {
          sse.close();
        } catch {}
        sse = null;
      }

      ws = io({ transports: ["websocket", "polling"], timeout: 6000, reconnection: true, reconnectionAttempts: Infinity });
      setChip(wsDot, wsText, "idle", "WS connecting…");
      setChip(mt5Dot, mt5Text, "idle", "MT5 syncing…");
      setChip(pingDot, pingText, "idle", "— ms");

      const connectDeadline = setTimeout(() => {
        if (!wsEverConnected && !(ws && ws.connected)) {
          try {
            ws.close();
          } catch {}
          setChip(wsDot, wsText, "idle", "WS failed • fallback SSE");
          startSSE();
        }
      }, 3200);

      ws.on("connect", () => {
        wsEverConnected = true;
        clearTimeout(connectDeadline);
        wsStatus = "connected";
        setChip(wsDot, wsText, "ok", "WS connected");
        pushTimelineEvent("connection_status", { ws: "connected" });
        refreshState();
      });
      ws.on("disconnect", () => {
        wsStatus = "disconnected";
        setChip(wsDot, wsText, "bad", "WS reconnecting…");
        pushTimelineEvent("connection_status", { ws: "disconnected" });
      });
      ws.on("connect_error", () => {
        wsErrorCount += 1;
        if (!wsEverConnected && wsErrorCount >= 3) {
          try {
            ws.close();
          } catch {}
          setChip(wsDot, wsText, "idle", "WS unavailable • fallback SSE");
          startSSE();
        }
      });
      ws.on("snapshot", (snap) => {
        try {
          applyState(snap);
          applyDailyChart(snap.daily);
          markSync("snapshot");
        } catch {}
      });
      ws.on("account_update", (p) => {
        if (!p) return;
        stateCache = stateCache || {};
        stateCache.account = p.account || null;
        applyPortfolio(stateCache.account, stateCache.stats);
        markSync("account");
      });
      ws.on("stats_update", (p) => {
        if (!p) return;
        stateCache = stateCache || {};
        stateCache.stats = p.stats || null;
        applyPortfolio(stateCache.account, stateCache.stats);
        markSync("stats");
      });
      ws.on("history_snapshot", (p) => {
        if (!p) return;
        stateCache = stateCache || {};
        stateCache.closed_trades = p.closed_trades || [];
        stateCache.daily = p.daily || [];
        applyDailyChart(stateCache.daily);
        applyUI();
        markSync("history");
        renderPi();
      });
      ws.on("history_appended", (p) => {
        const t = p && p.trade ? p.trade : null;
        if (!t) return;
        stateCache = stateCache || {};
        stateCache.closed_trades = stateCache.closed_trades || [];
        stateCache.closed_trades.unshift(t);
        stateCache.closed_trades = stateCache.closed_trades.slice(0, 2000);
        applyUI();
        markSync("history+");
        renderPi();
      });
      ws.on("position_opened", (p) => {
        const pos = p && p.position ? p.position : null;
        if (!pos) return;
        stateCache = stateCache || {};
        stateCache.open_positions = stateCache.open_positions || [];
        stateCache.open_positions.unshift(pos);
        applyUI();
        pushTimelineEvent("position_opened", p);
        markSync("pos+");
        renderPi();
      });
      ws.on("position_updated", (p) => {
        const items = p && Array.isArray(p.positions) ? p.positions : [];
        if (!items.length) return;
        stateCache = stateCache || {};
        const list = Array.isArray(stateCache.open_positions) ? stateCache.open_positions : [];
        const byId = new Map(list.map((x) => [String(x.position_id), x]));
        for (const u of items) {
          const pid = String(u.position_id || "");
          if (!pid) continue;
          const cur = u.position || byId.get(pid);
          if (cur) byId.set(pid, cur);
        }
        stateCache.open_positions = Array.from(byId.values());
        setOpenFiltered(stateCache.open_positions);
        pushTimelineEvent("position_updated", p);
        markSync("pos~");
        renderPi();
      });
      ws.on("position_closed", (p) => {
        const c = p && p.closed ? p.closed : null;
        const pid = c ? String(c.position_id || "") : String(p && p.position_id ? p.position_id : "");
        if (!pid) return;
        stateCache = stateCache || {};
        stateCache.open_positions = (stateCache.open_positions || []).filter((x) => String(x.position_id || "") !== pid);
        applyUI();
        pushTimelineEvent("position_closed", p);
        markSync("pos-");
        renderPi();
      });
      ws.on("connection_status", (p) => {
        if (!p) return;
        if (p.mt5) {
          const ok = String(p.mt5) === "connected";
          mt5Status = ok ? "connected" : "disconnected";
          setChip(mt5Dot, mt5Text, ok ? "ok" : "bad", ok ? "MT5 connected" : "MT5 disconnected");
        }
        if (p.ws) {
          const ok = String(p.ws) === "connected";
          setChip(wsDot, wsText, ok ? "ok" : "bad", ok ? "WS connected" : "WS disconnected");
        }
        pushTimelineEvent("connection_status", p);
        renderPi();
      });
      ws.on("latency_update", (p) => {
        try {
          const t = Number(p && p.t);
          if (!Number.isFinite(t)) return;
          pingMs = Math.max(0, Date.now() - t);
          pingText.textContent = `${Math.round(pingMs)} ms`;
          setChip(pingDot, pingText, pingMs < 120 ? "ok" : pingMs < 260 ? "idle" : "bad", `${Math.round(pingMs)} ms`);
        } catch {}
      });
      setInterval(() => {
        if (!ws || !ws.connected) return;
        ws.emit("client_ping", { t: Date.now() });
      }, 2000);
      return;
    } catch {}
  }
  if (!startSSE()) setInterval(refreshState, 3000);
}

el("refreshBtn").addEventListener("click", () => {
  checkHealth();
  refreshState();
});

historySearch?.addEventListener("input", () => setClosedFiltered(stateCache ? stateCache.closed_trades : []));
openSearch?.addEventListener("input", () => setOpenFiltered(stateCache ? stateCache.open_positions : []));

renderSpark(randomWalk(26));
checkHealth();
refreshState();
startRealtime();
setInterval(() => {
  const dt = lastSyncAt ? Math.max(0, Math.round((Date.now() - lastSyncAt) / 1000)) : null;
  const sync = dt === null ? "no sync" : dt <= 1 ? "sync now" : `sync ${dt}s`;
  metaLine.textContent = `${nowStamp()} • ${location.host} • ${sync} • ${lastSyncLabel}`;
  renderPi();
  renderRadar();
}, 1000);
setInterval(checkHealth, 6000);
setInterval(tickSpark, 1600);
