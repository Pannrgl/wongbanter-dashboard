import json
import os
import queue
import threading
import time
from datetime import datetime, timedelta
from typing import Any

import requests
from flask import Flask, Response, jsonify, request, send_file

from mt5_orders import compute_closed_pnl, compute_daily_closed_pnl, compute_deal_stats_today, get_account_snapshot, initialize_mt5, list_closed_trades, list_open_positions, send_market_order

app = Flask(__name__)

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, User-Agent, X-Dashboard-Secret'
    return response

TELEGRAM_BOT_TOKEN = "7408852623:AAHJ_sresG7ItyBExmzpHxDZokqJGMQKBCg"
TELEGRAM_CHAT_ID = "6470089932"

try:
    from flask_socketio import SocketIO
except Exception:
    SocketIO = None

socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading") if SocketIO is not None else None

_start_lock = threading.Lock()
_started = False


class EventHub:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._subscribers: set[queue.Queue[str]] = set()
        self._events: list[dict[str, Any]] = []
        self._open_positions: dict[int, dict[str, Any]] = {}
        self._closed: list[dict[str, Any]] = []
        self._account: dict[str, Any] | None = None
        self._stats: dict[str, Any] | None = None
        self._daily: list[dict[str, Any]] = []
        self._orders_today_date = datetime.now().date().isoformat()
        self._orders_today = 0
        self._next_id = 1

    def subscribe(self) -> queue.Queue[str]:
        q: queue.Queue[str] = queue.Queue(maxsize=200)
        with self._lock:
            self._subscribers.add(q)
        return q

    def unsubscribe(self, q: queue.Queue[str]) -> None:
        with self._lock:
            self._subscribers.discard(q)

    def publish(self, event: dict[str, Any]) -> None:
        with self._lock:
            event = dict(event)
            event["id"] = self._next_id
            self._next_id += 1
            event["ts"] = int(time.time())
            self._events.insert(0, event)
            self._events = self._events[:50]
            subscribers = list(self._subscribers)
        payload = json.dumps(event, separators=(",", ":"))
        for q in subscribers:
            try:
                q.put_nowait(payload)
            except Exception:
                pass

    def set_positions(self, positions: list[dict[str, Any]]) -> None:
        with self._lock:
            self._open_positions = {int(p["position_id"]): p for p in positions}

    def add_closed(self, item: dict[str, Any]) -> None:
        with self._lock:
            self._closed.insert(0, item)
            self._closed = self._closed[:500]

    def set_closed(self, items: list[dict[str, Any]]) -> None:
        with self._lock:
            self._closed = list(items)[:2000]

    def set_account(self, account: dict[str, Any] | None) -> None:
        with self._lock:
            self._account = account

    def set_stats(self, stats: dict[str, Any] | None) -> None:
        with self._lock:
            self._stats = stats
            if stats is not None:
                try:
                    v1 = int(stats.get("orders_filled") or 0)
                except Exception:
                    v1 = 0
                try:
                    v2 = int(stats.get("deals_in") or stats.get("trades") or 0)
                except Exception:
                    v2 = 0
                if v1 > self._orders_today:
                    self._orders_today = v1
                if v2 > self._orders_today:
                    self._orders_today = v2

    def set_daily(self, daily: list[dict[str, Any]]) -> None:
        with self._lock:
            self._daily = list(daily)[-366:]

    def add_daily_profit(self, close_time: int | None, profit: float | None) -> None:
        if close_time is None or profit is None:
            return
        try:
            day = datetime.fromtimestamp(int(close_time)).date().isoformat()
            p = float(profit)
        except Exception:
            return
        with self._lock:
            for row in self._daily:
                if row.get("date") == day:
                    row["pnl"] = float(row.get("pnl") or 0.0) + p
                    row["trades"] = int(row.get("trades") or 0) + 1
                    return
            self._daily.append({"date": day, "pnl": p, "trades": 1})
            self._daily.sort(key=lambda x: str(x.get("date") or ""))
            self._daily = self._daily[-366:]

    def record_order(self) -> int:
        today = datetime.now().date().isoformat()
        with self._lock:
            if self._orders_today_date != today:
                self._orders_today_date = today
                self._orders_today = 0
            self._orders_today += 1
            return self._orders_today

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            return {
                "ok": True,
                "server_time": int(time.time()),
                "account": self._account,
                "stats": self._stats,
                "daily": self._daily,
                "live": {"orders_today": self._orders_today, "orders_today_date": self._orders_today_date},
                "open_positions": list(self._open_positions.values()),
                "closed_trades": list(self._closed),
                "events": list(self._events),
            }


hub = EventHub()


def _emit_ws(event: str, payload: dict[str, Any]) -> None:
    if socketio is None:
        return
    try:
        socketio.emit(event, payload)
    except Exception:
        return


def _round(v: Any, digits: int) -> float | None:
    try:
        n = float(v)
    except Exception:
        return None
    if not (n == n):
        return None
    return round(n, digits)


def _sig_account(account: dict[str, Any] | None) -> tuple[Any, ...] | None:
    if not account:
        return None
    return (
        account.get("login"),
        account.get("server"),
        account.get("currency"),
        account.get("leverage"),
        _round(account.get("balance"), 2),
        _round(account.get("equity"), 2),
        _round(account.get("profit"), 2),
        _round(account.get("margin"), 2),
        _round(account.get("margin_free"), 2),
        _round(account.get("margin_level"), 1),
    )


def _sig_stats(stats: dict[str, Any] | None) -> tuple[Any, ...] | None:
    if not stats:
        return None
    return (
        stats.get("period"),
        _round(stats.get("net"), 2),
        stats.get("orders_filled"),
        stats.get("deals_in"),
        stats.get("deals_out"),
        stats.get("closed_trades"),
        stats.get("wins"),
        stats.get("losses"),
        _round(stats.get("winrate"), 1),
        (stats.get("profit_factor_infinite") is True),
        _round(stats.get("profit_factor"), 2),
    )


def _pos_key(p: dict[str, Any]) -> int:
    try:
        return int(p.get("position_id") or 0)
    except Exception:
        return 0


def _sig_position(p: dict[str, Any]) -> tuple[Any, ...]:
    return (
        str(p.get("symbol") or ""),
        str(p.get("side") or ""),
        _round(p.get("volume"), 2),
        _round(p.get("price_open"), 5),
        _round(p.get("price_current"), 5),
        _round(p.get("sl"), 5),
        _round(p.get("tp"), 5),
        _round(p.get("profit"), 2),
        _round(p.get("swap"), 2),
        int(p.get("time") or 0),
    )


def _changes(prev: dict[str, Any], cur: dict[str, Any]) -> dict[str, Any]:
    keys = ("price_current", "sl", "tp", "profit", "swap")
    out: dict[str, Any] = {}
    for k in keys:
        a = prev.get(k)
        b = cur.get(k)
        if k in ("profit", "swap"):
            a = _round(a, 2)
            b = _round(b, 2)
        elif k == "price_current":
            a = _round(a, 5)
            b = _round(b, 5)
        else:
            a = _round(a, 5)
            b = _round(b, 5)
        if a != b:
            out[k] = cur.get(k)
    return out


def _monitor_loop() -> None:
    last_positions: dict[int, dict[str, Any]] = {}
    last_account_sig: tuple[Any, ...] | None = None
    last_stats_sig: tuple[Any, ...] | None = None
    last_mt5_ok: bool | None = None
    account_interval = 0.35
    positions_interval = 0.20
    stats_interval = 0.75
    history_interval = 5.0
    last_account_at = 0.0
    last_positions_at = 0.0
    last_stats_at = 0.0
    last_history_at = 0.0
    while True:
        try:
            init_res = initialize_mt5()
            mt5_ok = bool(init_res.ok)
            if last_mt5_ok is None or last_mt5_ok != mt5_ok:
                last_mt5_ok = mt5_ok
                status_payload = {"mt5": "connected" if mt5_ok else "disconnected", "server_time": int(time.time())}
                _emit_ws("connection_status", status_payload)
                hub.publish({"type": "connection", "data": status_payload})
            if not mt5_ok:
                time.sleep(1.2)
                continue

            now_ts = time.time()
            if now_ts - last_account_at >= account_interval:
                account = get_account_snapshot()
                sig = _sig_account(account)
                if sig != last_account_sig:
                    last_account_sig = sig
                    hub.set_account(account)
                    _emit_ws("account_update", {"account": account, "server_time": int(now_ts)})
                    _emit_ws("balance_update", {"balance": account.get("balance") if account else None, "server_time": int(now_ts)})
                    _emit_ws("equity_update", {"equity": account.get("equity") if account else None, "server_time": int(now_ts)})
                    if account:
                        fp = None
                        try:
                            fp = float(account.get("equity")) - float(account.get("balance"))
                        except Exception:
                            fp = None
                        _emit_ws("pnl_update", {"floating_pnl": fp, "profit": account.get("profit"), "server_time": int(now_ts)})
                    hub.publish({"type": "portfolio", "data": {"account": account, "stats": hub.snapshot().get("stats")}})
                last_account_at = now_ts

            if now_ts - last_stats_at >= stats_interval:
                stats = compute_deal_stats_today()
                sig = _sig_stats(stats)
                if sig != last_stats_sig:
                    last_stats_sig = sig
                    hub.set_stats(stats)
                    _emit_ws("stats_update", {"stats": stats, "server_time": int(now_ts)})
                    hub.publish({"type": "portfolio", "data": {"account": hub.snapshot().get("account"), "stats": stats}})
                last_stats_at = now_ts

            if now_ts - last_history_at >= history_interval:
                now = datetime.now()
                date_from = now - timedelta(days=365)
                closed = list_closed_trades(date_from, now, limit=2000)
                hub.set_closed(closed)
                daily = compute_daily_closed_pnl(now - timedelta(days=365), now)
                hub.set_daily(daily)
                _emit_ws("history_snapshot", {"closed_trades": closed[:500], "daily": daily, "server_time": int(now_ts)})
                hub.publish({"type": "history", "data": {"closed_trades": closed[:200], "daily": daily}})
                last_history_at = now_ts

            if now_ts - last_positions_at >= positions_interval:
                positions = list_open_positions()
                hub.set_positions(positions)
                now = datetime.now()

                current = {_pos_key(p): p for p in positions if _pos_key(p)}
                opened_ids = set(current.keys()) - set(last_positions.keys())
                closed_ids = set(last_positions.keys()) - set(current.keys())

                if opened_ids:
                    for pid in opened_ids:
                        pos = current.get(pid)
                        if pos:
                            _emit_ws("position_opened", {"position": pos, "server_time": int(now_ts)})

                if closed_ids:
                    for pid in closed_ids:
                        prev = last_positions.get(pid) or {}
                        open_time = int(prev.get("time") or int(time.time()))
                        date_from = datetime.fromtimestamp(open_time) - timedelta(minutes=10)
                        pnl = compute_closed_pnl(pid, date_from=date_from, date_to=now) or {"position_id": pid}
                        closed_item = {
                            "position_id": pid,
                            "symbol": prev.get("symbol") or pnl.get("symbol"),
                            "side": prev.get("side"),
                            "volume": prev.get("volume"),
                            "price_open": prev.get("price_open"),
                            "sl": prev.get("sl"),
                            "tp": prev.get("tp"),
                            "profit": pnl.get("profit"),
                            "close_price": pnl.get("close_price"),
                            "close_time": pnl.get("close_time"),
                        }
                        hub.add_closed(closed_item)
                        hub.add_daily_profit(closed_item.get("close_time"), closed_item.get("profit"))
                        _emit_ws("position_closed", {"position_id": pid, "closed": closed_item, "server_time": int(now_ts)})
                        _emit_ws("history_appended", {"trade": closed_item, "server_time": int(now_ts)})
                        hub.publish({"type": "closed", "data": closed_item})

                updated_payload: list[dict[str, Any]] = []
                if current and last_positions:
                    for pid in set(current.keys()) & set(last_positions.keys()):
                        prev = last_positions.get(pid) or {}
                        cur = current.get(pid) or {}
                        if _sig_position(prev) == _sig_position(cur):
                            continue
                        ch = _changes(prev, cur)
                        if not ch:
                            continue
                        updated_payload.append({"position_id": pid, "changes": ch, "position": cur})

                if opened_ids or closed_ids or updated_payload:
                    if updated_payload:
                        _emit_ws("position_updated", {"positions": updated_payload, "server_time": int(now_ts)})
                    hub.publish({"type": "positions", "data": list(current.values())})

                last_positions = current
                last_positions_at = now_ts
        except Exception:
            pass

        time.sleep(0.25)


def _ensure_background_started() -> None:
    global _started
    if _started:
        return
    with _start_lock:
        if _started:
            return
        if app.debug and os.environ.get("WERKZEUG_RUN_MAIN") != "true":
            _started = True
            return
        t = threading.Thread(target=_monitor_loop, daemon=True)
        t.start()
        _started = True


def _get_env(name: str) -> str | None:
    value = os.getenv(name)
    if value is None:
        return None
    value = value.strip()
    return value or None


def _authorized(payload: dict[str, Any], req) -> bool:
    secret = _get_env("WEBHOOK_SECRET")
    if secret is None:
        return True
    provided_header = (req.headers.get("X-Webhook-Secret", "") or "").strip()
    provided_body = (payload.get("secret") or payload.get("token") or "").strip()
    return provided_header == secret or provided_body == secret


def _parse_signal(payload: dict[str, Any]) -> tuple[str, str, float, float, float] | None:
    text = (payload.get("text") or "").strip()
    symbol = (payload.get("symbol") or "XAUUSD").strip().upper()
    lot = float(payload.get("lot", 0.1))
    sl_pips = float(payload.get("rugine", 300))
    tp_pips = float(payload.get("untunge", 300))

    side = (payload.get("side") or "").strip().upper()
    if side in ("BUY", "SELL"):
        return symbol, side, lot, sl_pips, tp_pips

    up = text.upper()
    if "BUY" in up:
        return symbol, "BUY", lot, sl_pips, tp_pips
    if "SELL" in up:
        return symbol, "SELL", lot, sl_pips, tp_pips

    return None


def _telegram_send(message: str) -> None:
    token = _get_env("TELEGRAM_BOT_TOKEN") or TELEGRAM_BOT_TOKEN
    chat_id = _get_env("TELEGRAM_CHAT_ID") or TELEGRAM_CHAT_ID
    if token is None or chat_id is None:
        return

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    headers = {"Content-Type": "application/json"}
    payload = {"chat_id": chat_id, "text": message, "parse_mode": "HTML"}

    try:
        requests.post(url, headers=headers, json=payload, timeout=10)
    except Exception:
        return


@app.get("/")
def ui():
    _ensure_background_started()
    return send_file(os.path.join(os.path.dirname(__file__), "ui", "portfolio.html"))


def _safe_ui_path(name: str) -> str | None:
    base = os.path.join(os.path.dirname(__file__), "ui")
    target = os.path.abspath(os.path.join(base, name))
    if not target.startswith(os.path.abspath(base) + os.sep):
        return None
    if not os.path.exists(target):
        return None
    return target


@app.get("/assets/<path:name>")
def assets(name: str):
    _ensure_background_started()
    path = _safe_ui_path(name)
    if path is None:
        return jsonify({"ok": False}), 404
    return send_file(path)


@app.get("/health")
def health():
    _ensure_background_started()
    return jsonify({"ok": True})


@app.get("/state")
def state():
    _ensure_background_started()
    return jsonify(hub.snapshot())


@app.get("/events")
def events():
    _ensure_background_started()
    q = hub.subscribe()

    def gen():
        try:
            snap = json.dumps(hub.snapshot(), separators=(",", ":"))
            yield f"event: snapshot\ndata: {snap}\n\n"
            while True:
                try:
                    item = q.get(timeout=15)
                    yield f"data: {item}\n\n"
                except queue.Empty:
                    yield "event: ping\ndata: {}\n\n"
        finally:
            hub.unsubscribe(q)

    return Response(gen(), mimetype="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


if socketio is not None:
    @socketio.on("connect")
    def _ws_connect():
        _ensure_background_started()
        sid = getattr(request, "sid", None)
        if sid:
            try:
                socketio.emit("snapshot", hub.snapshot(), to=sid)
            except Exception:
                pass
        try:
            socketio.emit("connection_status", {"ws": "connected", "server_time": int(time.time())}, to=sid)
        except Exception:
            pass
        try:
            mt5_ok = bool(initialize_mt5().ok)
            socketio.emit(
                "connection_status",
                {"mt5": "connected" if mt5_ok else "disconnected", "server_time": int(time.time())},
                to=sid,
            )
        except Exception:
            pass

    @socketio.on("disconnect")
    def _ws_disconnect():
        sid = getattr(request, "sid", None)
        try:
            socketio.emit("connection_status", {"ws": "disconnected", "server_time": int(time.time())}, to=sid)
        except Exception:
            pass

    @socketio.on("client_ping")
    def _ws_ping(payload):
        sid = getattr(request, "sid", None)
        try:
            sent_at = payload.get("t") if isinstance(payload, dict) else None
        except Exception:
            sent_at = None
        out = {"t": sent_at, "server_time": int(time.time())}
        if sid:
            try:
                socketio.emit("latency_update", out, to=sid)
            except Exception:
                pass


@app.post("/trade")
@app.post("/execute")
def trade():
    _ensure_background_started()
    payload = request.get_json(silent=True) or {}
    if not _authorized(payload, request):
        return jsonify({"ok": False, "error": "Unauthorized"}), 401
    parsed = _parse_signal(payload)
    if parsed is None:
        return jsonify({"ok": False, "error": "No valid signal"}), 400

    symbol, side, lot, sl_pips, tp_pips = parsed
    res = send_market_order(symbol=symbol, volume=lot, side=side, sl_pips=sl_pips, tp_pips=tp_pips)

    if not res.ok:
        return jsonify({"ok": False, "error": res.message, "retcode": res.retcode}), 500

    order_no = hub.record_order()
    msg = f"{symbol} : {side}\nStop : {sl_pips} pips\nTake : {tp_pips}"
    _telegram_send(msg)
    event = {
        "type": "order",
        "data": {
            "symbol": symbol,
            "side": side,
            "lot": lot,
            "price": res.price,
            "sl": res.sl,
            "tp": res.tp,
            "order_ticket": res.order_ticket,
            "deal_ticket": res.deal_ticket,
        },
    }
    hub.publish(event)
    hub.publish({"type": "live", "data": {"orders_today": order_no}})
    account = get_account_snapshot()
    stats = compute_deal_stats_today()
    hub.set_account(account)
    hub.set_stats(stats)
    hub.publish({"type": "portfolio", "data": {"account": account, "stats": stats}})
    return jsonify(
        {
            "ok": True,
            "symbol": symbol,
            "side": side,
            "lot": lot,
            "sl_pips": sl_pips,
            "tp_pips": tp_pips,
            "price": res.price,
            "sl": res.sl,
            "tp": res.tp,
            "order_ticket": res.order_ticket,
            "deal_ticket": res.deal_ticket,
        }
    )


if __name__ == "__main__":
    if socketio is not None:
        socketio.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=True)
    else:
        app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=True)
