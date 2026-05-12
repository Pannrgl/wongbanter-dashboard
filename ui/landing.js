const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const qs = (sel, parent = document) => parent.querySelector(sel);
const qsa = (sel, parent = document) => Array.from(parent.querySelectorAll(sel));

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function fmt(n, digits = 2) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(digits);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function setCssVar(name, value) {
  document.documentElement.style.setProperty(name, value);
}

function smoothAnchorScroll() {
  const headerOffset = 78;
  document.addEventListener("click", (e) => {
    const a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (href === "#" || href === "#top") return;
    const id = href.slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const y = target.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top: Math.max(0, y), behavior: prefersReducedMotion ? "auto" : "smooth" });
  });
}

function initReveal() {
  const nodes = qsa(".reveal");
  if (!nodes.length) return;
  if (prefersReducedMotion) {
    for (const n of nodes) n.classList.add("in");
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    },
    { threshold: 0.14, rootMargin: "0px 0px -80px 0px" }
  );
  for (const n of nodes) io.observe(n);
}

function initCursor() {
  const cursor = qs(".cursor");
  if (!cursor) return;
  const isFine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  if (!isFine || prefersReducedMotion) return;
  cursor.style.opacity = "1";
  let x = window.innerWidth * 0.5;
  let y = window.innerHeight * 0.2;
  let tx = x;
  let ty = y;

  const onMove = (e) => {
    tx = e.clientX;
    ty = e.clientY;
  };
  window.addEventListener("mousemove", onMove, { passive: true });

  const tick = () => {
    x = lerp(x, tx, 0.18);
    y = lerp(y, ty, 0.18);
    setCssVar("--mx", `${x}px`);
    setCssVar("--my", `${y}px`);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function initMagneticButtons() {
  const isFine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  if (!isFine || prefersReducedMotion) return;
  const buttons = qsa(".magnetic");
  for (const btn of buttons) {
    let rect = null;
    const onEnter = () => {
      rect = btn.getBoundingClientRect();
    };
    const onLeave = () => {
      rect = null;
      btn.style.transform = "";
    };
    const onMove = (e) => {
      if (!rect) return;
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const mx = clamp(dx / rect.width, -0.6, 0.6);
      const my = clamp(dy / rect.height, -0.6, 0.6);
      btn.style.transform = `translate3d(${mx * 8}px, ${my * 7}px, 0)`;
    };
    btn.addEventListener("mouseenter", onEnter);
    btn.addEventListener("mouseleave", onLeave);
    btn.addEventListener("mousemove", onMove);
  }
}

function initParallax() {
  if (prefersReducedMotion) return;
  let sx = 0;
  let sy = 0;
  let tx = 0;
  let ty = 0;

  const isFine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  if (isFine) {
    window.addEventListener(
      "mousemove",
      (e) => {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        tx = clamp((e.clientX - cx) / cx, -1, 1) * 22;
        ty = clamp((e.clientY - cy) / cy, -1, 1) * 18;
      },
      { passive: true }
    );
  }

  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY || 0;
      const vy = clamp(y / 900, 0, 1) * 10;
      tx = tx;
      ty = ty - vy;
    },
    { passive: true }
  );

  const tick = () => {
    sx = lerp(sx, tx, 0.12);
    sy = lerp(sy, ty, 0.12);
    setCssVar("--sx", `${sx}px`);
    setCssVar("--sy", `${sy}px`);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function initTicker() {
  const track = qs(".ticker-track");
  if (!track) return;

  const base = [
    { s: "XAUUSD", p: 2345.2 },
    { s: "EURUSD", p: 1.0846 },
    { s: "NAS100", p: 18342.5 },
    { s: "US30", p: 39210.8 },
    { s: "GBPUSD", p: 1.2713 },
    { s: "BTCUSD", p: 68740.2 },
    { s: "ETHUSD", p: 3781.7 },
    { s: "USDJPY", p: 156.22 },
  ];

  const render = () => {
    const parts = [];
    for (const item of base) {
      const drift = (Math.random() - 0.5) * (item.s.includes("USD") && item.p < 10 ? 0.006 : item.p < 200 ? 0.12 : 4.8);
      const next = Math.max(0, item.p + drift);
      const chg = ((next - item.p) / Math.max(1e-9, item.p)) * 100;
      item.p = next;
      const cls = chg >= 0 ? "up" : "dn";
      const sign = chg >= 0 ? "+" : "";
      const price = item.p < 10 ? fmt(item.p, 4) : item.p < 200 ? fmt(item.p, 2) : fmt(item.p, 1);
      parts.push(
        `<span class="ticker-item"><strong>${item.s}</strong><span class="mono">${price}</span><span class="chg ${cls} mono">${sign}${fmt(chg, 2)}%</span></span>`
      );
    }
    const html = parts.join("") + parts.join("");
    track.innerHTML = html;
  };

  render();
  setInterval(render, 1300);
}

function initMarketList() {
  const list = qs("#marketList");
  const clock = qs("#clockChip");
  if (!list) return;

  const items = [
    { s: "XAUUSD", p: 2345.2, v: "Metals" },
    { s: "EURUSD", p: 1.0846, v: "FX" },
    { s: "NAS100", p: 18342.5, v: "Index" },
    { s: "US30", p: 39210.8, v: "Index" },
    { s: "BTCUSD", p: 68740.2, v: "Crypto" },
  ];

  const render = () => {
    const out = [];
    for (const it of items) {
      const vol = it.s.includes("USD") && it.p < 10 ? 0.0026 : it.p < 200 ? 0.08 : 3.6;
      const drift = (Math.random() - 0.52) * vol;
      const next = Math.max(0, it.p + drift);
      const chg = ((next - it.p) / Math.max(1e-9, it.p)) * 100;
      it.p = next;
      const cls = chg >= 0 ? "up" : "dn";
      const sign = chg >= 0 ? "+" : "";
      const price = it.p < 10 ? fmt(it.p, 4) : it.p < 200 ? fmt(it.p, 2) : fmt(it.p, 1);
      out.push(
        `<div class="mrow"><div class="ml"><div class="msym">${it.s}</div><div class="mmeta">${it.v}</div></div><div class="mr"><div class="mprice mono">${price}</div><div class="mchg ${cls} mono">${sign}${fmt(chg, 2)}%</div></div></div>`
      );
    }
    list.innerHTML = out.join("");
    if (clock) {
      const d = new Date();
      clock.textContent = d.toLocaleTimeString(undefined, { hour12: false });
    }
  };

  render();
  setInterval(render, 1200);
}

function initMiniKpis() {
  const eq = qs("#miniEq");
  const wr = qs("#miniWr");
  const pf = qs("#miniPf");
  if (!eq || !wr || !pf) return;
  let vEq = 100000;
  let vWr = 62.8;
  let vPf = 1.94;

  const tick = () => {
    vEq = Math.max(1, vEq + (Math.random() - 0.48) * 180);
    vWr = clamp(vWr + (Math.random() - 0.5) * 0.35, 48, 78);
    vPf = clamp(vPf + (Math.random() - 0.5) * 0.05, 1.1, 3.2);
    eq.textContent = `${fmt(vEq, 0)}`;
    wr.textContent = `${fmt(vWr, 1)}%`;
    pf.textContent = `${fmt(vPf, 2)}`;
  };
  tick();
  setInterval(tick, 1350);
}

function initCounters() {
  const nodes = qsa("[data-counter]");
  if (!nodes.length) return;
  const seen = new WeakSet();

  const animate = (el) => {
    if (seen.has(el)) return;
    seen.add(el);
    const raw = el.getAttribute("data-counter");
    const target = Number(raw);
    if (!Number.isFinite(target)) return;
    const isInt = Number.isInteger(target);
    const dur = prefersReducedMotion ? 0 : 950;
    const t0 = performance.now();
    const from = 0;
    const tick = (t) => {
      const p = dur <= 0 ? 1 : clamp((t - t0) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = from + (target - from) * eased;
      el.textContent = isInt ? String(Math.round(val)) : fmt(val, target >= 100 ? 0 : 2);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if (prefersReducedMotion) {
    for (const el of nodes) animate(el);
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        animate(e.target);
        io.unobserve(e.target);
      }
    },
    { threshold: 0.35, rootMargin: "0px 0px -80px 0px" }
  );
  for (const el of nodes) io.observe(el);
}

function initSparkline() {
  const path = qs("#sparkLinePath");
  const area = qs("#sparkArea");
  if (!path || !area) return;
  const w = 680;
  const h = 280;
  const padX = 18;
  const padY = 24;
  const n = 32;
  let v = 0.55;
  const values = [];

  const push = () => {
    v += (Math.random() - 0.5) * 0.14;
    v = clamp(v, 0.12, 0.92);
    values.push(v);
    if (values.length > n) values.shift();
  };

  for (let i = 0; i < n; i++) push();

  const render = () => {
    const dx = (w - padX * 2) / (values.length - 1);
    const pts = values.map((vv, i) => {
      const x = padX + i * dx;
      const y = padY + (1 - vv) * (h - padY * 2);
      return [x, y];
    });
    let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
    const lastX = pts[pts.length - 1][0];
    const dArea = `${d} L ${lastX.toFixed(2)} ${(h - 10).toFixed(2)} L ${padX.toFixed(2)} ${(h - 10).toFixed(2)} Z`;
    path.setAttribute("d", d);
    area.setAttribute("d", dArea);
  };

  render();
  if (prefersReducedMotion) return;
  setInterval(() => {
    push();
    render();
  }, 900);
}

function initCandles() {
  const root = qs("#candles");
  if (!root) return;
  const count = window.matchMedia && window.matchMedia("(max-width: 540px)").matches ? 22 : 28;
  root.style.gridTemplateColumns = `repeat(${count}, 1fr)`;
  const candles = [];

  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "candle";
    const body = document.createElement("div");
    body.className = "body";
    el.appendChild(body);
    root.appendChild(el);
    candles.push({ el, body, v: 0.5 });
  }

  const tick = () => {
    for (const c of candles) {
      c.v = clamp(c.v + (Math.random() - 0.5) * 0.16, 0.1, 0.92);
      const open = c.v;
      const close = clamp(open + (Math.random() - 0.5) * 0.22, 0.1, 0.92);
      const hi = clamp(Math.max(open, close) + Math.random() * 0.18, 0.1, 0.98);
      const lo = clamp(Math.min(open, close) - Math.random() * 0.18, 0.02, 0.92);
      const bTop = (1 - Math.max(open, close)) * 100;
      const bBot = (1 - Math.min(open, close)) * 100;
      const wTop = (1 - hi) * 100;
      const wBot = (1 - lo) * 100;
      const up = close >= open;
      const col = up ? "rgba(34, 255, 175, 0.68)" : "rgba(255, 91, 121, 0.6)";
      c.el.style.setProperty("--bTop", `${bTop.toFixed(2)}%`);
      c.el.style.setProperty("--bH", `${Math.max(6, (bBot - bTop)).toFixed(2)}%`);
      c.el.style.setProperty("--wTop", `${wTop.toFixed(2)}%`);
      c.el.style.setProperty("--wBot", `${Math.max(0, wBot).toFixed(2)}%`);
      c.el.style.setProperty("--bCol", col);
    }
  };

  tick();
  if (prefersReducedMotion) return;
  setInterval(tick, 1050);
}

function initTelemetry() {
  const latency = qs("#latencyChip");
  const uptime = qs("#uptimeChip");
  const exec = qs("#execVal");
  if (!latency && !uptime && !exec) return;

  let vLat = 42;
  let vUp = 99.99;
  let vEx = 8.9;

  const tick = () => {
    vLat = clamp(vLat + (Math.random() - 0.5) * 10, 18, 92);
    vUp = clamp(vUp + (Math.random() - 0.5) * 0.012, 99.8, 100);
    vEx = clamp(vEx + (Math.random() - 0.5) * 0.45, 6.9, 9.9);
    if (latency) latency.textContent = `${Math.round(vLat)} ms`;
    if (uptime) uptime.textContent = `${fmt(vUp, 2)}%`;
    if (exec) exec.textContent = `${fmt(vEx, 1)}/10`;
  };

  tick();
  setInterval(tick, 1200);
}

function initFooterYear() {
  const y = qs("#year");
  if (!y) return;
  y.textContent = String(new Date().getFullYear());
}

function boot() {
  smoothAnchorScroll();
  initReveal();
  initCursor();
  initMagneticButtons();
  initParallax();
  initTicker();
  initMarketList();
  initMiniKpis();
  initCounters();
  initSparkline();
  initCandles();
  initTelemetry();
  initFooterYear();
}

boot();

