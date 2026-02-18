import os
import sys
import traceback

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, HTTPException

app = FastAPI(title="AI Support LINE Bot")

# ── Capture any startup errors so we can see them via /debug ─────────────────
_startup_error: str | None = None

try:
    from linebot.v3 import WebhookHandler
    from linebot.v3.exceptions import InvalidSignatureError
    from linebot.v3.messaging import Configuration
    from linebot.v3.webhooks import MessageEvent, ImageMessageContent
    from handlers import image as image_handler

    LINE_CHANNEL_SECRET       = os.getenv("LINE_CHANNEL_SECRET")
    LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")

    configuration = Configuration(access_token=LINE_CHANNEL_ACCESS_TOKEN)
    handler       = WebhookHandler(LINE_CHANNEL_SECRET)

    @handler.add(MessageEvent, message=ImageMessageContent)
    def on_image(event: MessageEvent):
        try:
            image_handler.handle(event, configuration)
        except Exception as e:
            print(f"[ERROR] image handler: {e}")

except Exception:
    _startup_error = traceback.format_exc()
    handler = None


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    if _startup_error:
        return {"status": "error", "detail": _startup_error}
    return {"service": "ai-support LINE bot", "status": "ok"}


@app.get("/debug")
def debug():
    return {
        "startup_error": _startup_error,
        "sys_path":      sys.path[:5],
        "env_keys":      [k for k in os.environ if "LINE" in k or "OCR" in k],
        "cwd":           os.getcwd(),
    }


@app.post("/api/webhook")
async def webhook(request: Request):
    if _startup_error:
        raise HTTPException(status_code=500, detail="Bot not initialized")

    signature = request.headers.get("X-Line-Signature", "")
    body      = await request.body()

    try:
        handler.handle(body.decode("utf-8"), signature)
    except InvalidSignatureError:
        raise HTTPException(status_code=400, detail="Invalid LINE signature")

    return "OK"
