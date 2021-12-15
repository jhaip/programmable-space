from helper import init, claim, retract, prehook, subscription, batch, get_my_id_str
from pydub import AudioSegment
from pydub.playback import play
from datetime import datetime
import logging
import requests
import base64
import traceback
import os

download_cache = {}

@subscription(["$ $ wish $url would be played"])
def sub_callback(results):
    global download_cache
    for result in results:
        url = result["url"]
        filename = base64.b64encode(url)
        filepath = os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), 'files/sound_'+filename)
        if url not in download_cache:
            logging.info("{} downloading: {}".format(datetime.now().isoformat(), url))
            try:
                r = requests.get(url)
                with open(filepath, 'wb') as f:
                    f.write(r.content)
                    download_cache[url] = True
            except Exception as e:
                logging.error("error downloading")
                logging.error(traceback.format_exc())
        if url in download_cache:
            try:
                sound = AudioSegment.from_file(filepath)
                logging.info("{} playing: {}".format(datetime.now().isoformat(), url))
                play(sound)
                batch([{"type": "retract", "fact": [
                    ["variable", ""],
                    ["variable", ""],
                    ["text", "wish"],
                    ["text", url],
                    ["text", "would"],
                    ["text", "be"],
                    ["text", "played"],
                ]}])
            except Exception as e:
                logging.error("error playing file")
                logging.error(traceback.format_exc())

init(__file__)
