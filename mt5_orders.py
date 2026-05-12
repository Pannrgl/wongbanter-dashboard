from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, time
import threading
from typing import Any, Literal

import MetaTrader5 as mt5


Side = Literal["BUY", "SELL"]

_mt5_lock = threading.Lock()
_mt5_initialized = False


@dataclass(frozen=True)
class OrderResult:
    ok: bool
    retcode: int | None = None
    message: str | None = None
    raw: Any | None = None
    symbol: str | None = None
    side: Side | None = None
    volume: float | None = None
    price: float | None = None
    sl: float | None = None
    tp: float | None = None
    order_ticket: int | None = None
    deal_ticket: int | None = None


def initialize_mt5() -> OrderResult:
    global _mt5_initialized
    try:
        if _mt5_initialized:
            return OrderResult(ok=True, message="MT5 initialized")
        with _mt5_lock:
            if _mt5_initialized:
                return OrderResult(ok=True, message="MT5 initialized")
            if mt5.initialize():
                _mt5_initialized = True
                return OrderResult(ok=True, message="MT5 initialized")
            _mt5_initialized = False
            return OrderResult(ok=False, message="Failed to initialize MT5")
    except Exception as exc:
        _mt5_initialized = False
        return OrderResult(ok=False, message=str(exc))


def get_account_snapshot() -> dict[str, Any] | None:
    init_res = initialize_mt5()
    if not init_res.ok:
        return None

    info = mt5.account_info()
    if info is None:
        return None

    return {
        "login": int(info.login),
        "server": str(info.server),
        "currency": str(info.currency),
        "leverage": int(info.leverage),
        "balance": float(info.balance),
        "equity": float(info.equity),
        "profit": float(info.profit),
        "margin": float(info.margin),
        "margin_free": float(info.margin_free),
        "margin_level": float(info.margin_level) if info.margin_level else None,
    }


def compute_deal_stats_today() -> dict[str, Any] | None:
    init_res = initialize_mt5()
    if not init_res.ok:
        return None

    now = datetime.now()
    start = datetime.combine(date.today(), time.min)
    deals = mt5.history_deals_get(start, now)
    if deals is None:
        return None

    by_position: dict[int, dict[str, Any]] = defaultdict(lambda: {"profit": 0.0, "has_out": False})
    net = 0.0
    entry_in = 0
    entry_out = 0
    for d in deals:
        profit = float(d.profit) + float(d.commission) + float(d.swap)
        net += profit
        if int(getattr(d, "entry", 0)) == int(mt5.DEAL_ENTRY_IN):
            entry_in += 1
        if int(getattr(d, "entry", 0)) == int(mt5.DEAL_ENTRY_OUT):
            entry_out += 1
        pid = int(getattr(d, "position_id", 0) or 0)
        if pid:
            by_position[pid]["profit"] += profit
            if int(getattr(d, "entry", 0)) == int(mt5.DEAL_ENTRY_OUT):
                by_position[pid]["has_out"] = True

    orders_filled = 0
    orders = mt5.history_orders_get(start, now)
    if orders is not None:
        filled_state = int(getattr(mt5, "ORDER_STATE_FILLED", -1))
        partial_state = int(getattr(mt5, "ORDER_STATE_PARTIAL", -2))
        buy_type = int(getattr(mt5, "ORDER_TYPE_BUY", -1))
        sell_type = int(getattr(mt5, "ORDER_TYPE_SELL", -1))
        for o in orders:
            otype = int(getattr(o, "type", -999))
            if otype not in (buy_type, sell_type):
                continue
            state = int(getattr(o, "state", -999))
            if state in (filled_state, partial_state):
                orders_filled += 1

    closed = [float(v["profit"]) for v in by_position.values() if v.get("has_out")]
    wins = sum(1 for p in closed if p > 0)
    losses = sum(1 for p in closed if p < 0)
    gross_profit = sum(p for p in closed if p > 0)
    gross_loss = sum(abs(p) for p in closed if p < 0)

    closed_trades = len(closed)
    winrate = (wins / closed_trades) * 100.0 if closed_trades else None
    profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else None
    profit_factor_infinite = bool(gross_loss == 0 and gross_profit > 0)

    return {
        "period": "today",
        "from": int(start.timestamp()),
        "to": int(now.timestamp()),
        "net": float(net),
        "trades": int(entry_in),
        "deals_in": int(entry_in),
        "deals_out": int(entry_out),
        "orders_filled": int(orders_filled),
        "closed_trades": int(closed_trades),
        "wins": int(wins),
        "losses": int(losses),
        "winrate": float(winrate) if winrate is not None else None,
        "gross_profit": float(gross_profit),
        "gross_loss": float(gross_loss),
        "profit_factor": float(profit_factor) if profit_factor is not None else None,
        "profit_factor_infinite": profit_factor_infinite,
    }


def list_closed_trades(date_from: datetime, date_to: datetime, limit: int = 300) -> list[dict[str, Any]]:
    init_res = initialize_mt5()
    if not init_res.ok:
        return []

    deals = mt5.history_deals_get(date_from, date_to)
    if deals is None:
        return []

    sltp_by_pos: dict[int, dict[str, Any]] = {}
    orders = mt5.history_orders_get(date_from, date_to)
    if orders is not None:
        for o in orders:
            pid = int(getattr(o, "position_id", 0) or 0)
            if not pid:
                continue
            sl = float(o.sl) if getattr(o, "sl", 0) else None
            tp = float(o.tp) if getattr(o, "tp", 0) else None
            if sl is None and tp is None:
                continue
            prev = sltp_by_pos.get(pid, {})
            if sl is not None:
                prev["sl"] = sl
            if tp is not None:
                prev["tp"] = tp
            sltp_by_pos[pid] = prev

    agg: dict[int, dict[str, Any]] = {}
    for d in deals:
        pid = int(getattr(d, "position_id", 0) or 0)
        if not pid:
            continue
        item = agg.get(pid)
        if item is None:
            item = {
                "position_id": pid,
                "symbol": str(d.symbol),
                "side": None,
                "volume": 0.0,
                "price_open": None,
                "open_time": None,
                "close_price": None,
                "close_time": None,
                "profit": 0.0,
                "sl": None,
                "tp": None,
            }
            agg[pid] = item

        item["symbol"] = str(d.symbol)
        item["volume"] = float(item["volume"]) + float(d.volume)
        item["profit"] = float(item["profit"]) + float(d.profit) + float(d.commission) + float(d.swap)

        entry = int(getattr(d, "entry", 0))
        if entry == int(mt5.DEAL_ENTRY_IN):
            if item["open_time"] is None:
                item["open_time"] = int(d.time)
            if item["price_open"] is None:
                item["price_open"] = float(d.price)
            dtype = int(getattr(d, "type", 0))
            if dtype == int(mt5.DEAL_TYPE_BUY):
                item["side"] = "BUY"
            elif dtype == int(mt5.DEAL_TYPE_SELL):
                item["side"] = "SELL"
        elif entry == int(mt5.DEAL_ENTRY_OUT):
            item["close_time"] = int(d.time)
            item["close_price"] = float(d.price)

    out: list[dict[str, Any]] = []
    for pid, item in agg.items():
        if item.get("close_time") is None:
            continue
        st = sltp_by_pos.get(pid, {})
        item["sl"] = st.get("sl", item.get("sl"))
        item["tp"] = st.get("tp", item.get("tp"))
        out.append(item)

    out.sort(key=lambda x: int(x.get("close_time") or 0), reverse=True)
    return out[: max(1, int(limit))]


def compute_daily_closed_pnl(date_from: datetime, date_to: datetime) -> list[dict[str, Any]]:
    closed = list_closed_trades(date_from, date_to, limit=2000)
    by_day: dict[str, dict[str, Any]] = {}
    for t in closed:
        ct = int(t.get("close_time") or 0)
        if not ct:
            continue
        d = datetime.fromtimestamp(ct).date().isoformat()
        row = by_day.get(d)
        if row is None:
            row = {"date": d, "pnl": 0.0, "trades": 0}
            by_day[d] = row
        p = float(t.get("profit") or 0.0)
        row["pnl"] = float(row["pnl"]) + p
        row["trades"] = int(row["trades"]) + 1
    out = list(by_day.values())
    out.sort(key=lambda x: x["date"])
    return out

def _ensure_symbol(symbol: str) -> OrderResult:
    info = mt5.symbol_info(symbol)
    if info is None:
        return OrderResult(ok=False, message=f"Symbol not found: {symbol}")
    if not info.visible:
        if not mt5.symbol_select(symbol, True):
            return OrderResult(ok=False, message=f"Failed to select symbol: {symbol}")
    return OrderResult(ok=True, message="Symbol ready", raw=info)


def get_market_price(symbol: str, side: Side) -> float | None:
    tick = mt5.symbol_info_tick(symbol)
    if tick is None:
        return None
    return float(tick.ask if side == "BUY" else tick.bid)


def list_open_positions() -> list[dict[str, Any]]:
    init_res = initialize_mt5()
    if not init_res.ok:
        return []

    positions = mt5.positions_get()
    if positions is None:
        return []

    out: list[dict[str, Any]] = []
    for p in positions:
        side: Side = "BUY" if int(p.type) == int(mt5.POSITION_TYPE_BUY) else "SELL"
        out.append(
            {
                "position_id": int(p.ticket),
                "symbol": str(p.symbol),
                "side": side,
                "volume": float(p.volume),
                "price_open": float(p.price_open),
                "price_current": float(getattr(p, "price_current", 0.0) or 0.0),
                "sl": float(p.sl) if p.sl else None,
                "tp": float(p.tp) if p.tp else None,
                "profit": float(p.profit),
                "swap": float(getattr(p, "swap", 0.0) or 0.0),
                "time": int(p.time),
            }
        )
    return out


def compute_closed_pnl(position_id: int, date_from: datetime, date_to: datetime) -> dict[str, Any] | None:
    init_res = initialize_mt5()
    if not init_res.ok:
        return None

    deals = mt5.history_deals_get(date_from, date_to)
    if deals is None:
        return None

    profit_total = 0.0
    close_price: float | None = None
    close_time: int | None = None
    symbol: str | None = None
    volume_total = 0.0
    for d in deals:
        if int(d.position_id) != int(position_id):
            continue
        symbol = str(d.symbol)
        profit_total += float(d.profit) + float(d.commission) + float(d.swap)
        volume_total += float(d.volume)
        if int(d.entry) == int(mt5.DEAL_ENTRY_OUT):
            close_price = float(d.price)
            close_time = int(d.time)

    if symbol is None:
        return None

    return {
        "position_id": int(position_id),
        "symbol": symbol,
        "profit": float(profit_total),
        "close_price": close_price,
        "close_time": close_time,
        "volume": float(volume_total) if volume_total else None,
    }


def send_market_order(
    *,
    symbol: str,
    volume: float,
    side: Side,
    sl_pips: float,
    tp_pips: float,
    deviation: int = 20,
    magic: int = 234000,
    comment: str = "Order dari TradingView bot",
) -> OrderResult:
    init_res = initialize_mt5()
    if not init_res.ok:
        return init_res

    sym_res = _ensure_symbol(symbol)
    if not sym_res.ok:
        return sym_res

    price = get_market_price(symbol, side)
    if price is None:
        return OrderResult(ok=False, message=f"Failed to get tick price for {symbol}")

    point = float(mt5.symbol_info(symbol).point)
    if point <= 0:
        return OrderResult(ok=False, message=f"Invalid point size for {symbol}")

    order_type = mt5.ORDER_TYPE_BUY if side == "BUY" else mt5.ORDER_TYPE_SELL
    sl = price - sl_pips * point if side == "BUY" else price + sl_pips * point
    tp = price + tp_pips * point if side == "BUY" else price - tp_pips * point

    request: dict[str, Any] = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": float(volume),
        "type": int(order_type),
        "price": float(price),
        "sl": float(sl),
        "tp": float(tp),
        "deviation": int(deviation),
        "magic": int(magic),
        "comment": comment,
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_FOK,
    }

    result = mt5.order_send(request)
    if result is None:
        return OrderResult(ok=False, message="mt5.order_send returned None", symbol=symbol, side=side, volume=volume, price=price, sl=sl, tp=tp)

    if result.retcode != mt5.TRADE_RETCODE_DONE:
        return OrderResult(
            ok=False,
            retcode=int(result.retcode),
            message="Order rejected",
            raw=result,
            symbol=symbol,
            side=side,
            volume=volume,
            price=price,
            sl=sl,
            tp=tp,
            order_ticket=int(getattr(result, "order", 0) or 0) or None,
            deal_ticket=int(getattr(result, "deal", 0) or 0) or None,
        )

    return OrderResult(
        ok=True,
        retcode=int(result.retcode),
        message="Order placed",
        raw=result,
        symbol=symbol,
        side=side,
        volume=volume,
        price=price,
        sl=sl,
        tp=tp,
        order_ticket=int(getattr(result, "order", 0) or 0) or None,
        deal_ticket=int(getattr(result, "deal", 0) or 0) or None,
    )
