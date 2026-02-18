import os
import httpx
from dotenv import load_dotenv

load_dotenv()

_OCR_API_URL    = os.getenv("OCR_API_URL", "").rstrip("/")
_OCR_API_SECRET = os.getenv("OCR_API_SECRET", "")
_TIMEOUT        = 60  # seconds


def scan(image_bytes: bytes, prompt: str, model: str = "flash") -> dict:
    """
    Call the OCR scanner API.

    Returns the full response dict:
      { "prompt_key": ..., "model_used": ..., "data": {...} }
    """
    response = httpx.post(
        f"{_OCR_API_URL}/api/scan",
        headers={"X-API-Key": _OCR_API_SECRET},
        files={"image": ("image.jpg", image_bytes, "image/jpeg")},
        data={"prompt": prompt, "model": model},
        timeout=_TIMEOUT,
    )
    response.raise_for_status()
    return response.json()


def is_eir(image_bytes: bytes) -> bool:
    """Quick EIR classification using the cheapest model."""
    result = scan(image_bytes, prompt="eir_check", model="lite")
    return result.get("data", {}).get("is_eir", False) is True
