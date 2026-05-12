export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "Method Not Allowed" }));
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const token = (body && body.token ? String(body.token) : "").trim();
    const text = (body && body.text ? String(body.text) : "").trim();
    const chatIds = Array.isArray(body?.chatIds) ? body.chatIds.map((x) => String(x).trim()).filter(Boolean) : [];

    if (!token) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: false, error: "Missing token" }));
      return;
    }
    if (!text) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: false, error: "Missing text" }));
      return;
    }
    if (!chatIds.length) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: false, error: "Missing chatIds" }));
      return;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const results = [];

    for (const chat_id of chatIds.slice(0, 20)) {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id, text, parse_mode: "HTML" }),
      });
      const json = await r.json().catch(() => ({}));
      results.push({ chat_id, ok: r.ok && json && json.ok === true });
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: true, results }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Internal error" }));
  }
}

