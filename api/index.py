import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, HTTPException, BackgroundTasks, Security
from fastapi.responses import HTMLResponse
from fastapi.security import APIKeyHeader
from services import line_client, db
from handlers import image as image_handler
from dashboard_html import HTML as _DASHBOARD_HTML

app = FastAPI(title="AI Support LINE Bot")

# ── Auth ──────────────────────────────────────────────────────────────────────

_API_SECRET    = (os.getenv("OCR_API_SECRET") or "").strip()
_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def _require_key(key: str = Security(_api_key_header)) -> str:
    if not _API_SECRET or not key or key.strip() != _API_SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key")
    return key


# ── Dashboard ─────────────────────────────────────────────────────────────────

@app.get("/dashboard", response_class=HTMLResponse)
def dashboard():
    return _DASHBOARD_HTML


# ── Records API ───────────────────────────────────────────────────────────────

@app.get("/api/records")
def get_records(
    prompt:         str       = "eir",
    shipper:        str | None = None,
    booking_no:     str | None = None,
    container_no:   str | None = None,
    container_size: str | None = None,
    date_from:      str | None = None,
    date_to:        str | None = None,
    key: str = Security(_api_key_header),
):
    _require_key(key)

    filters = {
        "shipper":        shipper        or "",
        "booking_no":     booking_no     or "",
        "container_no":   container_no   or "",
        "container_size": container_size or "",
        "date_from":      date_from      or "",
        "date_to":        date_to        or "",
    }

    records = db.query(prompt, filters)
    return {"count": len(records), "records": records}


# ── LINE Webhook ──────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"service": "ai-support LINE bot", "status": "ok"}


@app.post("/api/webhook")
async def webhook(request: Request, background: BackgroundTasks):
    signature = request.headers.get("X-Line-Signature", "")
    body      = await request.body()

    if not line_client.verify_signature(body, signature):
        raise HTTPException(status_code=400, detail="Invalid LINE signature")

    events = json.loads(body).get("events", [])

    for event in events:
        if event.get("type") == "message" and event.get("message", {}).get("type") == "image":
            message_id  = event["message"]["id"]
            reply_token = event.get("replyToken", "")
            background.add_task(image_handler.handle, message_id, reply_token)

    return "OK"
