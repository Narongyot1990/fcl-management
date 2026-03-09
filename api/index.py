import logging
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, HTTPException, BackgroundTasks, Security, Body
from fastapi.security import APIKeyHeader
from services import line_client, db
from handlers import image as image_handler

app = FastAPI(title="AI Support LINE Bot")

# Vercel expects a handler named 'handler' at module level
handler = None
if __name__ == "__main__":
    # For local development with uvicorn
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
else:
    # For Vercel deployment
    from mangum import Mangum
    handler = Mangum(app)

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
