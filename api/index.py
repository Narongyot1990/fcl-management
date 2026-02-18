import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, HTTPException
from linebot.v3 import WebhookHandler
from linebot.v3.exceptions import InvalidSignatureError
from linebot.v3.messaging import Configuration
from linebot.v3.webhooks import MessageEvent, ImageMessageContent

from handlers import image as image_handler

LINE_CHANNEL_SECRET       = os.getenv("LINE_CHANNEL_SECRET")
LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")

configuration = Configuration(access_token=LINE_CHANNEL_ACCESS_TOKEN)
handler       = WebhookHandler(LINE_CHANNEL_SECRET)

app = FastAPI(title="AI Support LINE Bot")


@app.get("/")
def root():
    return {"service": "ai-support LINE bot", "status": "ok"}


@app.post("/api/webhook")
async def webhook(request: Request):
    signature = request.headers.get("X-Line-Signature", "")
    body      = await request.body()

    try:
        handler.handle(body.decode("utf-8"), signature)
    except InvalidSignatureError:
        raise HTTPException(status_code=400, detail="Invalid LINE signature")

    return "OK"


@handler.add(MessageEvent, message=ImageMessageContent)
def on_image(event: MessageEvent):
    try:
        image_handler.handle(event, configuration)
    except Exception as e:
        # Log but don't crash — Vercel must return 200 to LINE
        print(f"[ERROR] image handler: {e}")
