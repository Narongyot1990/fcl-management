from linebot.v3.messaging import (
    ApiClient, Configuration, MessagingApi, MessagingApiBlob,
    ReplyMessageRequest, TextMessage,
)
from linebot.v3.webhooks import MessageEvent

from services import ocr_client


def handle(event: MessageEvent, configuration: Configuration):
    """
    Full pipeline for an image received in LINE:
      1. Download image bytes
      2. Classify: is EIR?  (lite model — cheap)
      3. If yes → extract EIR fields  (flash model)
      4. Reply with formatted text
    """
    with ApiClient(configuration) as client:
        blob_api = MessagingApiBlob(client)
        image_bytes = blob_api.get_message_content(event.message.id).read()

    if not ocr_client.is_eir(image_bytes):
        return  # Not an EIR — silently ignore

    result = ocr_client.scan(image_bytes, prompt="eir", model="flash")
    data   = result.get("data", {})
    text   = _format(data)

    with ApiClient(configuration) as client:
        MessagingApi(client).reply_message(
            ReplyMessageRequest(
                reply_token=event.reply_token,
                messages=[TextMessage(text=text)],
            )
        )


def _format(data: dict) -> str:
    def v(key): return data.get(key) or "-"

    return (
        f"[พบใบ EIR]\n"
        f"Container : {v('container_no')}\n"
        f"ขนาด     : {v('container_size')}\n"
        f"Booking   : {v('booking_no')}\n"
        f"Seal      : {v('seal_no')}\n"
        f"Tare      : {v('tare_weight')}\n"
        f"ทะเบียน  : {v('truck_plate')}"
    )
