from services import ocr_client, line_client, db

_PROMPT_KEY = "eir"
_OCR_MODEL  = "flash"


def handle(message_id: str, reply_token: str, is_res: bool) -> None:
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

    required = ["shipper", "booking_no", "container_size", "container_no"]
    if not all(data.get(f) for f in required):
        return  # Incomplete — skip silently

    saved, _ = db.save(_PROMPT_KEY, data)

    is_res and line_client.reply_text(reply_token, _format(data, saved)) or None


_SEP = "─" * 13


def _format(data: dict, saved: bool) -> str:
    def v(key): return data.get(key) or "-"

    status = "Saved" if saved else "Already exists"

    return "\n".join([
        _SEP,
        f"Shipper   : {v('shipper')}",
        f"Booking   : {v('booking_no')}",
        f"Size      : {v('container_size')}",
        f"Container : {v('container_no')}",
        f"Seal      : {v('seal_no')}",
        f"Tare      : {v('tare_weight')}",
        f"Truck     : {v('truck_plate')}",
        f"Date/Time : {v('date_time')}",
        _SEP,
        f"Status    : {status}",
    ])
