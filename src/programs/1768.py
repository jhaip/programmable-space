from adafruit_magtag.magtag import MagTag
import re
DATA_SOURCE = "http://192.168.1.34:5000/select?first=1&subscription=%5B%22reading%20list%20%24%20is%20%24title%20%24%20%24%22%5D"
magtag = MagTag(url=DATA_SOURCE)
magtag.network.connect()
magtag.add_text(
    text_position=(
        (magtag.graphics.display.width // 2) - 1,
        (magtag.graphics.display.height // 2) - 1,
    ),
    text_scale=3,
    text_anchor_point=(0.5, 0.5),
    is_data=False,
)
try:
    value = magtag.fetch()
    print("Response is", value)
    title = re.search(r"title\":\"(.+)\"", value).group(1)
    magtag.set_text("Read\n"+title, 0)
except (ValueError, RuntimeError) as e:
    print("Some error occured, retrying! -", e)
magtag.exit_and_deep_sleep(60)
