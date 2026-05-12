import json
import os
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler

DEFAULT_MT5_EXECUTOR_BASE_URL = "https://a950-13-38-39-20.ngrok-free.app"


def _read_body(req: BaseHTTPRequestHandler) -> bytes:
    length = int(req.headers.get("content-length") or "0")
    if length <= 0:
        return b""
    return req.rfile.read(length)


def _json_response(req: BaseHTTPRequestHandler, status: int, payload: dict) -> None:
    data = json.dumps(payload).encode("utf-8")
    req.send_response(status)
    req.send_header("Content-Type", "application/json; charset=utf-8")
    req.send_header("Content-Length", str(len(data)))
    req.send_header("Access-Control-Allow-Origin", "*")
    req.send_header("Access-Control-Allow-Headers", "Content-Type, X-Webhook-Secret")
    req.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    req.end_headers()
    req.wfile.write(data)


def _forward_to_executor(payload: dict, incoming_secret: str | None) -> tuple[int, dict]:
    executor_url = (os.getenv("MT5_EXECUTOR_URL") or "").strip()
    if not executor_url:
        base = (os.getenv("MT5_EXECUTOR_BASE_URL") or "").strip()
        if base:
            executor_url = base.rstrip("/") + "/execute"
        else:
            base = DEFAULT_MT5_EXECUTOR_BASE_URL.strip()
            executor_url = base.rstrip("/") + "/execute" if base else ""

    if not executor_url:
        return 500, {"ok": False, "error": "MT5_EXECUTOR_URL not set"}

    secret = (os.getenv("WEBHOOK_SECRET") or "").strip()
    provided_header = (incoming_secret or "").strip()
    provided_body = (payload.get("secret") or payload.get("token") or "").strip()
    if secret and provided_header != secret and provided_body != secret:
        return 401, {"ok": False, "error": "Unauthorized"}

    req = urllib.request.Request(
        executor_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-Webhook-Secret": secret,
        },
        method="POST",
    )

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
        _json_response(self, 200, {"ok": True, "service": "tradingview-webhook", "endpoint": "/api/trade"})

    def do_POST(self):
        body = _read_body(self)
        try:
            payload = json.loads(body.decode("utf-8")) if body else {}
        except Exception:
            _json_response(self, 400, {"ok": False, "error": "Invalid JSON"})
            return

        incoming_secret = self.headers.get("X-Webhook-Secret")
        status, res_payload = _forward_to_executor(payload, incoming_secret)
        _json_response(self, status, res_payload)
