import json
import os
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, urlunparse

DEFAULT_MT5_EXECUTOR_BASE_URL = "https://a950-13-38-39-20.ngrok-free.app"


def _json_response(req: BaseHTTPRequestHandler, status: int, payload: dict) -> None:
    data = json.dumps(payload).encode("utf-8")
    req.send_response(status)
    req.send_header("Content-Type", "application/json; charset=utf-8")
    req.send_header("Content-Length", str(len(data)))
    req.send_header("Access-Control-Allow-Origin", "*")
    req.send_header("Access-Control-Allow-Headers", "Content-Type, X-Webhook-Secret, X-Dashboard-Secret")
    req.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
    req.end_headers()
    req.wfile.write(data)


def _executor_state_url() -> str:
    base = (os.getenv("MT5_EXECUTOR_BASE_URL") or "").strip()
    if base:
        return base.rstrip("/") + "/state"

    trade_url = (os.getenv("MT5_EXECUTOR_URL") or "").strip()
    if not trade_url:
        base = DEFAULT_MT5_EXECUTOR_BASE_URL.strip()
        return base.rstrip("/") + "/state" if base else ""

    parsed = urlparse(trade_url)
    if parsed.scheme and parsed.netloc:
        base2 = urlunparse((parsed.scheme, parsed.netloc, "", "", "", ""))
        return base2.rstrip("/") + "/state"

    return trade_url.rstrip("/") + "/state"


def _authorized(req: BaseHTTPRequestHandler) -> bool:
    secret = (os.getenv("DASHBOARD_SECRET") or "").strip()
    if not secret:
        return True
    provided = (req.headers.get("X-Dashboard-Secret", "") or "").strip()
    return provided == secret


def _forward_state() -> tuple[int, dict]:
    url = _executor_state_url()
    if not url:
        return 500, {"ok": False, "error": "MT5_EXECUTOR_BASE_URL or MT5_EXECUTOR_URL not set"}

    req = urllib.request.Request(url, headers={"Accept": "application/json"}, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            raw = res.read().decode("utf-8", errors="replace")
            try:
                return int(res.status), json.loads(raw) if raw else {"ok": True}
            except Exception:
                return int(res.status), {"ok": True, "raw": raw}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return int(e.code), json.loads(raw) if raw else {"ok": False}
        except Exception:
            return int(e.code), {"ok": False, "raw": raw}
    except Exception as e:
        return 502, {"ok": False, "error": str(e)}


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        _json_response(self, 204, {})

    def do_GET(self):
        if not _authorized(self):
            _json_response(self, 401, {"ok": False, "error": "Unauthorized"})
            return
        status, payload = _forward_state()
        _json_response(self, status, payload)
