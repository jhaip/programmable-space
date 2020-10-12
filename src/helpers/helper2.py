import time
import zmq
import logging
import json
import uuid
import random
import os
import sys

context = zmq.Context()
rpc_url = os.getenv('PROG_SPACE_SERVER_URL', "localhost")
client = context.socket(zmq.DEALER)

MY_ID = None
MY_ID_STR = None
SUBSCRIPTION_ID_LEN = len(str(uuid.uuid4()))
init_ping_id = str(uuid.uuid4())
server_listening = False
select_ids = {}
subscription_ids = {}

py_subscriptions = []
py_prehook = None

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
    client.send_multipart(["....CLAIM{}{}".format(
        MY_ID_STR, fact_string)], zmq.NOBLOCK)


def batch(batch_claims):
    client.send_multipart(["....BATCH{}{}".format(
        MY_ID_STR, json.dumps(batch_claims)).encode()], zmq.NOBLOCK)


def retract(fact_string):
    client.send_multipart(["..RETRACT{}{}".format(
        MY_ID_STR, fact_string)], zmq.NOBLOCK)


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
    client.send_multipart([msg], zmq.NOBLOCK)


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
    client.send_multipart([msg.encode()], zmq.NOBLOCK)


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


def listen(blocking=True):
    global server_listening, MY_ID
    flags = 0
    if not blocking:
        flags = zmq.NOBLOCK
    try:
        raw_msg = client.recv_multipart(flags=flags)
    except zmq.Again:
        return False
    string = raw_msg[0].decode()
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
    global server_listening, client, init_ping_id, py_subscriptions, py_prehook
    SERVER_NO_RESPONSE_TIMEOUT_TIME_SECONDS = 2
    if server_listening:
        print("checking if server is still listening")
        server_listening = False
        init_ping_id = str(uuid.uuid4())
        listening_start_time = time.time()
        client.send_multipart([".....PING{}{}".format(MY_ID_STR, init_ping_id).encode()])
        while not server_listening:
            listen(blocking=False)
            # poll quickly went we think the server is already running and should respond
            time.sleep(0.01)
            if time.time() - listening_start_time > SERVER_NO_RESPONSE_TIMEOUT_TIME_SECONDS:
                # no response from server, assume server is dead
                check_server_connection()
                break
    else:
        print("SERVER DIED, attempting to reconnect")
        reconnect_check_delay_s = 10
        init_ping_id = str(uuid.uuid4())
        listening_start_time = time.time()
        client.send_multipart([".....PING{}{}".format(MY_ID_STR, init_ping_id).encode()])
        while not server_listening:
            print("checking if server is alive")
            listen(blocking=False)
            time.sleep(0.5)
            if time.time() - listening_start_time > SERVER_NO_RESPONSE_TIMEOUT_TIME_SECONDS:
                print("no response from server, sleeping for a bit...")
                time.sleep(reconnect_check_delay_s)
                client.send_multipart([".....PING{}{}".format(MY_ID_STR, init_ping_id).encode()])
        print("SERVER IS ALIVE!")
        if py_prehook:
            py_prehook()
        for s in py_subscriptions:
            query = s[0]
            callback = s[1]
            subscribe(query, callback)


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
    print("tcp://{0}:5570".format(rpc_url))
    # print(logPath)
    # print("-")
    client.setsockopt(zmq.IDENTITY, MY_ID_STR.encode())
    client.connect("tcp://{0}:5570".format(rpc_url))
    print("connected")
    client.send_multipart([".....PING{}{}".format(MY_ID_STR, init_ping_id).encode()])
    print("sent ping")
    listen()  # assumes the first message recv'd will be the PING response

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
