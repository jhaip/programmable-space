import time
import logging
import json
import uuid
import random
import os
import sys
import math
import shlex
import websocket
import threading
from queue import Queue, Empty
from threading import Thread

rpc_url = os.getenv('PROG_SPACE_SERVER_URL', "localhost")

MY_ID = None
MY_ID_STR = None
SUBSCRIPTION_ID_LEN = len(str(uuid.uuid4()))
init_ping_id = str(uuid.uuid4())
server_listening = False
select_ids = {}
subscription_ids = {}

py_subscriptions = []
py_prehook = None

outq = Queue()
in_q = Queue()


def get_my_id_str():
    global MY_ID_STR
    return MY_ID_STR


def get_my_id_pre_init(root_filename):
    global MY_ID, MY_ID_STR
    scriptName = os.path.basename(root_filename)
    scriptNameNoExtension = os.path.splitext(scriptName)[0]
    fileDir = os.path.dirname(os.path.realpath(root_filename))
    logPath = os.path.join(fileDir, 'logs/' + scriptNameNoExtension + '.log')
    logging.basicConfig(filename=logPath, level=logging.INFO)
    MY_ID = (scriptName.split(".")[0]).split("__")[0]
    return MY_ID


def override_my_id(id):
    global MY_ID, MY_ID_STR
    MY_ID = id
    MY_ID_STR = str(MY_ID).zfill(4)


def claim(fact_string):
    outq.put("....CLAIM{}{}".format(
        MY_ID_STR, fact_string))


def batch(batch_claims):
    outq.put("....BATCH{}{}".format(
        MY_ID_STR, json.dumps(batch_claims)))


def retract(fact_string):
    outq.put("..RETRACT{}{}".format(
        MY_ID_STR, fact_string))


def select(query_strings, callback):
    select_id = str(uuid.uuid4())
    query = {
        "id": select_id,
        "facts": query_strings
    }
    query_msg = json.dumps(query)
    select_ids[select_id] = callback
    msg = "...SELECT{}{}".format(MY_ID_STR, query_msg)
    logging.debug(msg)
    outq.put(msg)


def subscribe(query_strings, callback):
    subscription_id = str(uuid.uuid4())
    query = {
        "id": subscription_id,
        "facts": query_strings
    }
    query_msg = json.dumps(query)
    subscription_ids[subscription_id] = callback
    msg = "SUBSCRIBE{}{}".format(MY_ID_STR, query_msg)
    logging.debug(msg)
    outq.put(msg)


def parse_results(val):
    json_val = json.loads(val)
    results = []
    for result in json_val:
        new_result = {}
        for key in result:
            value_type = result[key][0]
            if value_type == "integer":
                new_result[key] = int(result[key][1])
            elif value_type == "float":
                new_result[key] = float(result[key][1])
            else:
                new_result[key] = str(result[key][1])
        results.append(new_result)
    return results


def string_to_term(x):
    if x[0] == '"':
        return ["text", x[1:-1]]
    try:
        num = float(x)
        if "." in x:
            return ["float", "{:.6f}".format(num)]
        return ["integer", str(int(num))]
    except:
        if x[0] == "#":
            return ["id", x[1:]]
        if x[0] == "$":
            return ["variable", x[1:]]
        if x[0] == "%":
            return ["postfix", x[1:]]
        return ["text", x]


def tokenize_string(s):
    shlex.split(s)


def fully_parse_fact(q):
    if type(q) == list:
        terms = []
        for qe in q:
            if type(qe) == list:
                terms.append(qe)
            else:
                q_tokens = tokenize_string(qe)
                for x in q_tokens:
                    terms.push(string_to_term(x))
    else:
        q_tokens = tokenize_string(q)
        return [string_to_term(x) for x in q_tokens]


def listen(blocking=True):
    global server_listening, MY_ID
    try:
        raw_msg = in_q.get(block=blocking)
    except Empty:
        return False
    string = raw_msg
    source_len = 4
    server_send_time_len = 13
    id = string[source_len:(source_len + SUBSCRIPTION_ID_LEN)]
    val = string[(source_len + SUBSCRIPTION_ID_LEN +
                  server_send_time_len):]
    if id == init_ping_id:
        server_listening = True
        logging.info("SERVER IS LISTENING {}".format(MY_ID))
    elif id in select_ids:
        callback = select_ids[id]
        del select_ids[id]
        callback(val)
    elif id in subscription_ids:
        logging.debug(string)
        callback = subscription_ids[id]
        callback(parse_results(val))
    else:
        logging.info("UNRECOGNIZED:")
        logging.info(string)
    return True


def check_server_connection():
    return  # this doesn't matter for websockets?


def websocket_worker():
    global in_q, outq

    def on_message(ws, message):
        logging.debug("on message: {}".format(message))
        in_q.put(message)

    def on_error(ws, error):
        logging.error(error)

    def on_close(ws, close_status_code, close_msg):
        logging.info("### closed ###")
    
    def ws_send_worker(ws):
        global outq
        logging.info("inside ws send worker")
        while True:
            try:
                data = outq.get(block=True)
                ws.send(data)
            except Empty:
                pass

    def on_open(ws):
        logging.info("websocket connection opened")
        ws.send(".....PING{}{}".format(MY_ID_STR, init_ping_id))
        threading.Thread(target=ws_send_worker, args=(ws,)).start()

    # websocket.enableTrace(True)
    ws = websocket.WebSocketApp("ws://{}:8080/".format(rpc_url),
                                on_open=on_open,
                                on_message=on_message,
                                on_error=on_error,
                                on_close=on_close)

    wst = threading.Thread(target=ws.run_forever) #(skip_utf8_validation=True, ping_interval=3))
    wst.daemon = True
    wst.start()
    # skipping utf validation makes it a little faster
    # ws.run_forever(skip_utf8_validation=True, ping_interval=3)
    logging.info("Webocket worker closed")


def init(root_filename, skipListening=False):
    global MY_ID, MY_ID_STR, py_subscriptions, py_prehook
    scriptName = os.path.basename(root_filename)
    scriptNameNoExtension = os.path.splitext(scriptName)[0]
    fileDir = os.path.dirname(os.path.realpath(root_filename))
    logPath = os.path.join(fileDir, 'logs/' + scriptNameNoExtension + '.log')
    logging.basicConfig(filename=logPath, level=logging.INFO)
    if MY_ID_STR is None:
        MY_ID = (scriptName.split(".")[0]).split("__")[0]
        MY_ID_STR = str(MY_ID).zfill(4)
    print("INSIDE INIT:")
    print(MY_ID)
    print(MY_ID_STR)
    print(rpc_url)
    # print(logPath)
    # print("-")
    websocket_worker()

    # time.sleep(1.0)

    if py_prehook:
        py_prehook()
    # for s in selects:
    #     query = s[0]
    #     callback = s[1]
    #     select(query, callback)
    for s in py_subscriptions:
        query = s[0]
        callback = s[1]
        subscribe(query, callback)
    if skipListening:
        return
    while True:
        listen()


def prehook(func):
    global py_prehook
    py_prehook = func

    def function_wrapper(x):
        func(x)
    return function_wrapper


def subscription(expr):
    def subscription_decorator(func):
        global py_subscriptions
        py_subscriptions.append((expr, func))

        def function_wrapper(x):
            func(x)
        return function_wrapper
    return subscription_decorator
