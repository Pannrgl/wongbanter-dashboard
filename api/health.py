import json
import os
import urllib.request
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, urlunparse


def _executor_base_url() -> str:
    base = (os.getenv("MT5_EXECUTOR_BASE_URL") or "").strip()
    if base:
        return base.rstrip("/")

    trade_url = (os.getenv("MT5_EXECUTOR_URL") or "").strip()
    if not trade_url:
        return ""

    parsed = urlparse(trade_url)
    if parsed.scheme and parsed.netloc:
        return urlunparse((parsed.scheme, parsed.netloc, "", "", "", "")).rstrip("/")

    return trade_url.rstrip("/")


def _ping_executor(base_url: str) -> bool:
    if not base_url:
        return True
    url = base_url.rstrip("/") + "/health"
    req = urllib.request.Request(url, headers={"Accept": "application/json"}, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=3) as res:
            raw = res.read().decode("utf-8", errors="replace")
            data = json.loads(raw) if raw else {}
            return bool(data.get("ok"))
    except Exception:
        return False


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Webhook-Secret")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self):
        base = _executor_base_url()
        ok = _ping_executor(base)
        data = json.dumps({"ok": ok, "executor": base or None}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Webhook-Secret")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(data)
