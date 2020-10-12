import subprocess
import logging
from helper2 import init, claim, retract, prehook, subscription, batch, get_my_id_str

@subscription(["$ $ wish file $name would be printed"])
def sub_callback(results):
    claims = []
    claims.append({"type": "retract", "fact": [
        ["variable", ""],
        ["variable", ""],
        ["text", "wish"],
        ["text", "file"],
        ["variable", ""],
        ["text", "would"],
        ["text", "be"],
        ["text", "printed"],
    ]})
    batch(claims)
    for result in results:
        name = result["name"]
        logging.info("PRINTING:")
        logging.info(name)
        subprocess.call(['/usr/bin/lpr', name])

init(__file__)
