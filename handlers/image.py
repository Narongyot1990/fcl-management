from services import ocr_client, line_client


def handle(message_id: str, reply_token: str) -> None:
    """
    Full pipeline for an image received in LINE:
      1. Download image bytes
      2. Classify: is EIR?  (lite model — cheap)
      3. If yes → extract EIR fields  (flash model)
      4. Reply with formatted text
    """
    image_bytes = line_client.get_image_bytes(message_id)

    if not ocr_client.is_eir(image_bytes):
        return  # Not an EIR — silently ignore

    result = ocr_client.scan(image_bytes, prompt="eir", model="flash")
    data   = result.get("data", {})
    text   = _format(data)

    line_client.reply_text(reply_token, text)


def _format(data: dict) -> str:
    def v(key): return data.get(key) or "-"

    return (
        f"shipper     : {v('shipper')}\n"
        f"Booking     : {v('booking_no')}\n"
        f"size        : {v('container_size')}\n"
        f"Container   : {v('container_no')}\n"
        f"Seal        : {v('seal_no')}\n"
        f"Tare        : {v('tare_weight')}\n"
        f"truck plate : {v('truck_plate')}\n"
        f"date/time   : {v('date_time')}"
    )
