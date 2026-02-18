"""
Minimal LINE Messaging API client — no SDK dependency.
Uses HMAC-SHA256 for signature verification and httpx for HTTP calls.
"""
import hashlib
import hmac
import base64
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

_CHANNEL_SECRET       = (os.getenv("LINE_CHANNEL_SECRET") or "").strip()
_CHANNEL_ACCESS_TOKEN = (os.getenv("LINE_CHANNEL_ACCESS_TOKEN") or "").strip()

_API_BASE  = "https://api.line.me"
_DATA_BASE = "https://api-data.line.me"
_HEADERS   = {"Authorization": f"Bearer {_CHANNEL_ACCESS_TOKEN}"}


def verify_signature(body: bytes, signature: str) -> bool:
    """Verify X-Line-Signature header."""
    digest = hmac.new(
        _CHANNEL_SECRET.encode("utf-8"),
        body,
        hashlib.sha256,
    ).digest()
    expected = base64.b64encode(digest).decode("utf-8")
    return hmac.compare_digest(expected, signature)


def get_image_bytes(message_id: str) -> bytes:
    """Download image content from LINE."""
    url = f"{_DATA_BASE}/v2/bot/message/{message_id}/content"
    resp = httpx.get(url, headers=_HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.content


def reply_text(reply_token: str, text: str) -> None:
    """Send a plain text reply."""
    payload = {
        "replyToken": reply_token,
        "messages": [{"type": "text", "text": text}],
    }
    resp = httpx.post(
        f"{_API_BASE}/v2/bot/message/reply",
        headers={**_HEADERS, "Content-Type": "application/json"},
        json=payload,
        timeout=10,
    )
    resp.raise_for_status()
