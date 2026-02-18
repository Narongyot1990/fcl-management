"""
MongoDB CRUD service — prompt-agnostic, reusable across all prompt types.

To support a new prompt, add entries to COLLECTIONS and DEDUP_KEYS below.
"""
import os
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from bson.errors import InvalidId
from pymongo import MongoClient, DESCENDING
from pymongo.collection import Collection
from dotenv import load_dotenv

load_dotenv()

# ── Config: extend here when adding new prompt types ─────────────────────────

COLLECTIONS: dict[str, str] = {
    "eir": "eir_records",
}

# Fields used for duplicate detection per prompt.
# All listed fields must be non-null to perform a dedup check.
DEDUP_KEYS: dict[str, list[str]] = {
    "eir": ["container_no", "booking_no"],
}

# ── Connection (reused across warm Vercel invocations) ────────────────────────

_DB_NAME = os.getenv("MONGODB_DB", "eir_scanner")
_client: MongoClient | None = None


def _get_client() -> MongoClient:
    global _client
    if _client is None:
        uri = os.getenv("MONGODB_URI")
        if not uri:
            raise EnvironmentError("MONGODB_URI is not set")
        _client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    return _client


def _get_collection(prompt_key: str) -> Collection:
    name = COLLECTIONS.get(prompt_key, prompt_key)
    return _get_client()[_DB_NAME][name]


# ── Public API ────────────────────────────────────────────────────────────────

def save(prompt_key: str, data: dict) -> tuple[bool, dict]:
    """
    Save extracted data for a given prompt type.

    Performs a duplicate check using the DEDUP_KEYS defined for the prompt.
    If all dedup keys are present and a matching document already exists,
    the record is NOT saved.

    Returns:
        (True,  saved_doc)    — new record saved successfully
        (False, existing_doc) — duplicate found, not saved
    """
    collection = _get_collection(prompt_key)
    dedup_keys = DEDUP_KEYS.get(prompt_key, [])
    query      = _build_query(data, dedup_keys)

    if query:
        existing = collection.find_one(query)
        if existing:
            existing.pop("_id", None)
            return False, existing

    doc = {
        **data,
        "prompt_key": prompt_key,
        "created_at": datetime.now(timezone.utc),
    }
    collection.insert_one(doc)
    doc.pop("_id", None)
    return True, doc


def query(prompt_key: str, filters: dict | None = None, limit: int = 500) -> list[dict]:
    """
    Fetch records for a given prompt type with optional search filters.

    Supported filter keys:
        shipper, booking_no, container_no  — case-insensitive substring match
        container_size                      — exact match
        date_from, date_to                 — ISO date strings (YYYY-MM-DD), filter on created_at
    """
    collection = _get_collection(prompt_key)
    mongo_filter = _build_search_filter(filters or {})

    docs = []
    for doc in collection.find(mongo_filter).sort("created_at", DESCENDING).limit(limit):
        doc["_id"] = str(doc["_id"])
        if isinstance(doc.get("created_at"), datetime):
            doc["created_at"] = doc["created_at"].isoformat()
        docs.append(doc)
    return docs


_UPDATABLE_FIELDS = {
    "shipper", "booking_no", "container_size", "container_no",
    "seal_no", "tare_weight", "truck_plate", "date_time",
}


def delete(prompt_key: str, record_id: str) -> bool:
    """Delete a record by its MongoDB _id string. Returns True if deleted."""
    try:
        oid = ObjectId(record_id)
    except (InvalidId, Exception):
        return False
    result = _get_collection(prompt_key).delete_one({"_id": oid})
    return result.deleted_count > 0


def update(prompt_key: str, record_id: str, data: dict) -> bool:
    """Patch allowed fields of a record. Returns True if matched."""
    try:
        oid = ObjectId(record_id)
    except (InvalidId, Exception):
        return False
    patch = {
        k: (v.strip() if isinstance(v, str) and v.strip() else None)
        for k, v in data.items()
        if k in _UPDATABLE_FIELDS
    }
    if not patch:
        return False
    result = _get_collection(prompt_key).update_one({"_id": oid}, {"$set": patch})
    return result.matched_count > 0


def _build_search_filter(filters: dict) -> dict:
    f: dict = {}

    for field in ("shipper", "booking_no", "container_no"):
        val = filters.get(field, "").strip()
        if val:
            f[field] = {"$regex": val, "$options": "i"}

    size = filters.get("container_size", "").strip()
    if size:
        f["container_size"] = size

    date_from = filters.get("date_from", "")
    date_to   = filters.get("date_to", "")
    if date_from or date_to:
        date_f: dict = {}
        if date_from:
            date_f["$gte"] = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
        if date_to:
            # include the full end day
            date_f["$lt"] = (datetime.fromisoformat(date_to) + timedelta(days=1)).replace(tzinfo=timezone.utc)
        f["created_at"] = date_f

    return f


def _build_query(data: dict, keys: list[str]) -> dict | None:
    """
    Build a MongoDB filter from dedup keys.
    Returns None if any required key is missing/null in data
    (in that case, we cannot reliably dedup → allow save).
    """
    if not keys:
        return None
    query = {}
    for key in keys:
        val = data.get(key)
        if not val:
            return None
        query[key] = val
    return query
