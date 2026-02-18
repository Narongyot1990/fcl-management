"""
MongoDB CRUD service — prompt-agnostic, reusable across all prompt types.

To support a new prompt, add entries to COLLECTIONS and DEDUP_KEYS below.
"""
import os
from datetime import datetime, timezone
from pymongo import MongoClient
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
