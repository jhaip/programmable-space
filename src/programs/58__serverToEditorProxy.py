import time
import logging
import json
import uuid
import zmq
from helper2 import init, claim, retract, prehook, subscription, batch, get_my_id_str

proxy_context = zmq.Context()
proxy_client = None
proxy_connected = False
last_proxy_heartbeat = time.time()
health_check_delay_s = 10
PROXY_URL = "192.168.1.34"

def check_and_connect_proxy_server():
    global proxy_context, proxy_client, proxy_connected, PROXY_URL, last_proxy_heartbeat, health_check_delay_s
    if not proxy_connected or time.time() - last_proxy_heartbeat > health_check_delay_s:
        if not proxy_connected:
            logging.info("creating a new proxy_content")
            proxy_client = proxy_context.socket(zmq.DEALER)
            proxy_client.setsockopt(zmq.IDENTITY, get_my_id_str().encode())
            proxy_client.connect("tcp://{0}:5570".format(PROXY_URL))
            logging.info("connection established")
        else:
            logging.info("checking if proxy server is still alive")
        last_proxy_heartbeat = time.time()
        init_ping_id = str(uuid.uuid4())
        proxy_client.send_multipart([".....PING{}{}".format(get_my_id_str(), init_ping_id).encode()])
        proxy_connected = False
        proxy_server_timeout_s = 2
        poll_start_time = time.time()
        while time.time() - poll_start_time < proxy_server_timeout_s:
            try:
                raw_msg = proxy_client.recv_multipart(flags=zmq.NOBLOCK)
                proxy_connected = True
                break
            except zmq.Again:
                time.sleep(0.01)
        if not proxy_connected:
            logging.info("proxy server died, message dropped")
            proxy_client.disconnect("tcp://{0}:5570".format(PROXY_URL))
            logging.info("disconnected proxy_client")
            proxy_client.close()
            logging.info("closed proxy_client")
            return False
    return True

@subscription(["$ $ $name has paper ID $id", "$ $ $name has source code $code"])
def sub_callback_graphics(results):
    global proxy_client
    if not check_and_connect_proxy_server():
        return
    logging.info("proxying message")
    claims = []
    claims.append({"type": "retract", "fact": [
        ["id", get_my_id_str()],
        ["id", "1"],
        ["postfix", ""],
    ]})
    for result in results:
        claims.append({"type": "claim", "fact": [
            ["id", get_my_id_str()],
            ["id", "1"],
            ["text", str(result["name"])],
            ["text", "has"],
            ["text", "paper"],
            ["text", "ID"],
            ["integer", str(result["id"])],
        ]})
        claims.append({"type": "claim", "fact": [
            ["id", get_my_id_str()],
            ["id", "1"],
            ["text", str(result["name"])],
            ["text", "has"],
            ["text", "source"],
            ["text", "code"],
            ["text", str(result["code"])],
        ]})
    proxy_client.send_multipart(["....BATCH{}{}".format(
        get_my_id_str(), json.dumps(claims)).encode()], zmq.NOBLOCK)


@subscription(["$wisher $ wish $name has source code $code"])
def sub_callback_graphics(results):
    global proxy_client
    if not check_and_connect_proxy_server():
        return
    logging.info("proxying message")
    claims = []
    claims.append({"type": "retract", "fact": [
        ["id", get_my_id_str()],
        ["id", "2"],
        ["postfix", ""],
    ]})
    claims.append({"type": "retract", "fact": [
        ["variable", ""],
        ["variable", ""],
        ["text", "wish"],
        ["variable", ""],
        ["text", "has"],
        ["text", "source"],
        ["text", "code"],
        ["variable", ""],
    ]})
    for result in results:
        # Avoid forwarding the proxies own message back to itself
        if result["wisher"] not in ["57", "#57"]:
            claims.append({"type": "claim", "fact": [
                ["id", get_my_id_str()],
                ["id", "2"],
                ["text", "wish"],
                ["text", str(result["name"])],
                ["text", "has"],
                ["text", "source"],
                ["text", "code"],
                ["text", str(result["code"])],
            ]})
    proxy_client.send_multipart(["....BATCH{}{}".format(
        get_my_id_str(), json.dumps(claims)).encode()], zmq.NOBLOCK)

@subscription(["$wisher $ wish a paper would be created in $lang with source code $code @ $time"])
def sub_callback_graphics(results):
    global proxy_client
    if not check_and_connect_proxy_server():
        return
    logging.info("proxying message")
    claims = []
    claims.append({"type": "retract", "fact": [
        ["id", get_my_id_str()],
        ["id", "3"],
        ["postfix", ""],
    ]})
    claims.append({"type": "retract", "fact": [
        ["variable", ""],
        ["variable", ""],
        ["text", "wish"],
        ["text", "a"],
        ["text", "paper"],
        ["text", "would"],
        ["text", "be"],
        ["text", "created"],
        ["text", "in"],
        ["variable", ""],
        ["text", "with"],
        ["text", "source"],
        ["text", "code"],
        ["variable", ""],
        ["text", "@"],
        ["variable", ""],
    ]})
    for result in results:
        # Avoid forwarding the proxies own message back to itself
        if result["wisher"] not in ["57", "#57"]:
            claims.append({"type": "claim", "fact": [
                ["id", get_my_id_str()],
                ["id", "3"],
                ["text", "wish"],
                ["text", "a"],
                ["text", "paper"],
                ["text", "would"],
                ["text", "be"],
                ["text", "created"],
                ["text", "in"],
                ["text", str(result["lang"])],
                ["text", "with"],
                ["text", "source"],
                ["text", "code"],
                ["text", str(result["code"])],
                ["text", "@"],
                ["integer", str(result["time"])],
            ]})
    proxy_client.send_multipart(["....BATCH{}{}".format(
        get_my_id_str(), json.dumps(claims)).encode()], zmq.NOBLOCK)

@subscription(["$ $ paper 1013 is pointing at paper $paperId"])
def sub_callback_graphics(results):
    global proxy_client
    if not check_and_connect_proxy_server():
        return
    logging.info("proxying message")
    claims = []
    claims.append({"type": "retract", "fact": [
        ["id", get_my_id_str()],
        ["id", "4"],
        ["postfix", ""],
    ]})
    for result in results:
        claims.append({"type": "claim", "fact": [
            ["id", get_my_id_str()],
            ["id", "4"],
            ["text", "paper"],
            ["integer", "1013"],
            ["text", "is"],
            ["text", "pointing"],
            ["text", "at"],
            ["text", "paper"],
            ["integer", str(result["paperId"])],
        ]})
    proxy_client.send_multipart(["....BATCH{}{}".format(
        get_my_id_str(), json.dumps(claims)).encode()], zmq.NOBLOCK)


init(__file__)