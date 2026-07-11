import os
import re
import sys
from typing import Optional

from dotenv import load_dotenv
from fastapi import Body, FastAPI, HTTPException, Request, Security
from fastapi.responses import JSONResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

from services import db

app = FastAPI(title="AI Support API")

# Vercel Python handler - use built-in FastAPI adapter
handler = app

_API_SECRET = (os.getenv("OCR_API_SECRET") or "").strip()
_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def _require_key(key: str = Security(_api_key_header)) -> str:
    if not _API_SECRET or not key or key.strip() != _API_SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key")
    return key


@app.get("/api/records")
def get_records(
    prompt: str = "eir",
    shipper: str | None = None,
    booking_no: str | None = None,
    container_no: str | None = None,
    container_size: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    key: str = Security(_api_key_header),
):
    _require_key(key)

    filters = {
        "shipper": shipper or "",
        "booking_no": booking_no or "",
        "container_no": container_no or "",
        "container_size": container_size or "",
        "date_from": date_from or "",
        "date_to": date_to or "",
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
            value = int(ch)
        else:
            value = _ISO6346_LETTER_MAP.get(ch, 0)
        total += value * (2 ** i)
    remainder = total % 11
    return 0 if remainder == 10 else remainder


def validate_iso6346(container_no: str) -> tuple[bool, str]:
    """
    Validate a container number against ISO 6346.
    Format: 4 letters (owner 3 + category 1) + 6 digits + 1 check digit.
    """
    raw = container_no.strip().upper().replace(" ", "").replace("-", "")
    if not re.fullmatch(r"[A-Z]{4}\d{7}", raw):
        return (
            False,
            "Container number must be 4 letters + 7 digits (e.g. MSCU1234567)",
        )

    owner = raw[:4]
    serial = raw[4:10]
    given_check = int(raw[10])
    expected = _iso6346_check_digit(owner, serial)
    if given_check != expected:
        return False, f"Invalid ISO 6346 check digit: expected {expected}, got {given_check}"
    return True, ""


class BookingContainerPayload(BaseModel):
    booking_no: str = Field(..., description="Booking number (must exist in system)")
    container_no: str = Field(..., description="Container number validated against ISO 6346")
    seal_no: Optional[str] = Field(None, description="Seal number")
    container_size: Optional[str] = Field(None, description="Container size, e.g. 40HC, 20, 40")
    container_size_code: Optional[str] = Field(None, description="ISO type code, e.g. 45G1, 22G1")
    tare_weight: Optional[str] = Field(None, description="Tare weight in KG")


@app.post("/api/bookings/container")
def update_booking_container(
    payload: BookingContainerPayload,
    key: str = Security(_api_key_header),
):
    _require_key(key)

    valid, reason = validate_iso6346(payload.container_no)
    if not valid:
        raise HTTPException(status_code=422, detail={"field": "container_no", "error": reason})

    booking = db.get_booking_by_no(payload.booking_no)
    if booking is None:
        raise HTTPException(
            status_code=404,
            detail=f"Booking '{payload.booking_no}' not found in the system",
        )

    data = {
        "container_no": payload.container_no.strip().upper(),
        "seal_no": payload.seal_no,
        "container_size": payload.container_size,
        "container_size_code": payload.container_size_code,
        "tare_weight": payload.tare_weight,
    }
    data = {key: value for key, value in data.items() if value is not None}

    ok, updated = db.update_booking_container(payload.booking_no, data)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Booking '{payload.booking_no}' not found")

    return JSONResponse(status_code=200, content={"updated": True, "booking": updated})


@app.get("/")
def root():
    return {"service": "ai-support api", "status": "ok"}
