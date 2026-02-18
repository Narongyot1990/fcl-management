import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from services import line_client
from handlers import image as image_handler

app = FastAPI(title="AI Support LINE Bot")


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
            # Run in background so LINE gets 200 immediately
            background.add_task(image_handler.handle, message_id, reply_token)

    return "OK"
