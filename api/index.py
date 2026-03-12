import logging
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import re
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks, Security, Body
from fastapi.responses import JSONResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
from typing import Optional
from services import line_client, db
from handlers import image as image_handler

app = FastAPI(title="AI Support LINE Bot")

# Vercel Python handler - use built-in FastAPI adapter
handler = app

# ── Auth ──────────────────────────────────────────────────────────────────────

_API_SECRET    = (os.getenv("OCR_API_SECRET") or "").strip()
_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def _require_key(key: str = Security(_api_key_header)) -> str:
    if not _API_SECRET or not key or key.strip() != _API_SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key")
    return key


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


@app.put("/api/records/{record_id}")
def update_record(
    record_id: str,
    data: dict = Body(...),
    key: str = Security(_api_key_header),
):
    _require_key(key)
    if not db.update("eir", record_id, data):
        raise HTTPException(status_code=404, detail="Record not found")
    return {"updated": True}


@app.delete("/api/records/{record_id}")
def delete_record(
    record_id: str,
    key: str = Security(_api_key_header),
):
    _require_key(key)
    if not db.delete("eir", record_id):
        raise HTTPException(status_code=404, detail="Record not found")
    return {"deleted": True}


# ── Generic CRUD API ──────────────────────────────────────────────────────────

@app.get("/api/collections/{collection}")
def get_collection_records(
    collection: str,
    request: Request,
    key: str = Security(_api_key_header),
):
    _require_key(key)
    if collection not in db.COLLECTIONS:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    filters = dict(request.query_params)
    filters.pop("key", None)
    
    records = db.query(collection, filters)
    return {"count": len(records), "records": records}


@app.post("/api/collections/{collection}")
def create_collection_record(
    collection: str,
    data: dict = Body(...),
    key: str = Security(_api_key_header),
):
    _require_key(key)
    if collection not in db.COLLECTIONS:
        raise HTTPException(status_code=404, detail="Collection not found")
        
    saved, doc = db.save(collection, data)
    if not saved:
        raise HTTPException(status_code=409, detail="Record might already exist (deduplication)")
    return {"created": True, "record": doc}


@app.put("/api/collections/{collection}/{record_id}")
def update_collection_record(
    collection: str,
    record_id: str,
    data: dict = Body(...),
    key: str = Security(_api_key_header),
):
    _require_key(key)
    if collection not in db.COLLECTIONS:
        raise HTTPException(status_code=404, detail="Collection not found")
        
    if not db.update(collection, record_id, data):
        raise HTTPException(status_code=404, detail="Record not found")
    return {"updated": True}


@app.delete("/api/collections/{collection}/{record_id}")
def delete_collection_record(
    collection: str,
    record_id: str,
    key: str = Security(_api_key_header),
):
    _require_key(key)
    if collection not in db.COLLECTIONS:
        raise HTTPException(status_code=404, detail="Collection not found")
        
    if not db.delete(collection, record_id):
        raise HTTPException(status_code=404, detail="Record not found")
    return {"deleted": True}


# ── ISO 6346 Container Number Validator ──────────────────────────────────────

# Mapping per ISO 6346: letters A-Z skip multiples of 10 (A=10,B=12,...,K=21,L=23,...)
_ISO6346_LETTER_MAP: dict[str, int] = {}
_n = 10
for _c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
    if _n % 10 == 0:
        _n += 1
    _ISO6346_LETTER_MAP[_c] = _n
    _n += 1


def _iso6346_check_digit(owner: str, serial: str) -> int:
    """Compute ISO 6346 check digit. owner=4 chars (e.g. 'MSCU'), serial=6 digits."""
    chars = (owner + serial).upper()
    total = 0
    for i, ch in enumerate(chars):
        if ch.isdigit():
            v = int(ch)
        else:
            v = _ISO6346_LETTER_MAP.get(ch, 0)
        total += v * (2 ** i)
    remainder = total % 11
    return 0 if remainder == 10 else remainder


def validate_iso6346(container_no: str) -> tuple[bool, str]:
    """
    Validate a container number against ISO 6346.
    Format: 4 letters (owner 3 + category 1) + 6 digits + 1 check digit
    Returns (True, "") if valid, (False, reason) if invalid.
    """
    raw = container_no.strip().upper().replace(" ", "").replace("-", "")
    if not re.fullmatch(r"[A-Z]{4}\d{7}", raw):
        return False, f"Container number must be 4 letters + 7 digits (e.g. MSCU1234567), got: '{container_no}'"
    owner  = raw[:4]
    serial = raw[4:10]
    given_check = int(raw[10])
    expected    = _iso6346_check_digit(owner, serial)
    if given_check != expected:
        return False, f"Invalid ISO 6346 check digit: expected {expected}, got {given_check}"
    return True, ""


# ── Booking Container Update API ──────────────────────────────────────────────

class BookingContainerPayload(BaseModel):
    booking_no:          str            = Field(..., description="Booking number (must exist in system)")
    container_no:        str            = Field(..., description="Container number — validated against ISO 6346")
    seal_no:             Optional[str]  = Field(None, description="Seal number")
    container_size:      Optional[str]  = Field(None, description="Container size, e.g. 40HC, 20, 40")
    container_size_code: Optional[str]  = Field(None, description="ISO type code, e.g. 45G1, 22G1")
    tare_weight:         Optional[str]  = Field(None, description="Tare weight in KG")


@app.post("/api/bookings/container")
def update_booking_container(
    payload: BookingContainerPayload,
    key: str = Security(_api_key_header),
):
    """
    Update the 5 container fields of a booking identified by booking_no.

    - booking_no must match an existing booking in the system.
    - container_no is validated against ISO 6346 (4 letters + 6 digits + check digit).
    - Returns 200 with the updated booking document on success.
    """
    _require_key(key)

    # 1. Validate ISO 6346
    valid, reason = validate_iso6346(payload.container_no)
    if not valid:
        raise HTTPException(status_code=422, detail={"field": "container_no", "error": reason})

    # 2. Check booking exists
    booking = db.get_booking_by_no(payload.booking_no)
    if booking is None:
        raise HTTPException(
            status_code=404,
            detail=f"Booking '{payload.booking_no}' not found in the system",
        )

    # 3. Patch the 5 container fields
    data = {
        "container_no":        payload.container_no.strip().upper(),
        "seal_no":             payload.seal_no,
        "container_size":      payload.container_size,
        "container_size_code": payload.container_size_code,
        "tare_weight":         payload.tare_weight,
    }
    data = {k: v for k, v in data.items() if v is not None}

    ok, updated = db.update_booking_container(payload.booking_no, data)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Booking '{payload.booking_no}' not found")

    return JSONResponse(status_code=200, content={"updated": True, "booking": updated})


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
            group_id = event.get("source", {}).get("groupId", "")
            print(f"Received image message: {message_id, reply_token, group_id}") 
           #background.add_task(image_handler.handle, message_id, reply_token, is_res=False)
        logging.info(f"Received event: {event}")
        

    return "OK"
