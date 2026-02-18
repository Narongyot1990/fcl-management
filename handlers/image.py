from services import ocr_client, line_client, db

_PROMPT_KEY = "eir"
_OCR_MODEL  = "flash"


def handle(message_id: str, reply_token: str) -> None:
    """
    Single-call OCR pipeline:
      1. Download image
      2. Run EIR prompt once (flash model)
      3. If container_no found → it's an EIR → save + reply
      4. If not → not an EIR → silently ignore
    """
    image_bytes = line_client.get_image_bytes(message_id)

    result = ocr_client.scan(image_bytes, prompt=_PROMPT_KEY, model=_OCR_MODEL)
    data   = result.get("data", {})

    if not data.get("container_no"):
        return  # Not an EIR

    saved, _ = db.save(_PROMPT_KEY, data)

    line_client.reply_text(reply_token, _format(data, saved))


def _format(data: dict, saved: bool) -> str:
    def v(key): return data.get(key) or "-"

    status = "บันทึกแล้ว" if saved else "มีในระบบแล้ว"

    return (
        f"shipper     : {v('shipper')}\n"
        f"Booking     : {v('booking_no')}\n"
        f"size        : {v('container_size')}\n"
        f"Container   : {v('container_no')}\n"
        f"Seal        : {v('seal_no')}\n"
        f"Tare        : {v('tare_weight')}\n"
        f"truck plate : {v('truck_plate')}\n"
        f"date/time   : {v('date_time')}\n"
        f"สถานะ      : {status}"
    )
