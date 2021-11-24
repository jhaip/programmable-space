import websocket
# also install wsaccel to make websocket faster
import _thread
import time

startTime = None
count = 0


def on_message(ws, message):
    global count
    if message == f"{count}":
        count += 1
        if count >= 10000:
            print(f"DONE! {time.time() - startTime}")
        else:
            ws.send(f"{count}")
    # print(message)


def on_error(ws, error):
    print(error)


def on_close(ws, close_status_code, close_msg):
    print("### closed ###")


def on_open(ws):
    global startTime
    startTime = time.time()
    ws.send(f"{count}")
    # def run(*args):
    #     for i in range(3):
    #         time.sleep(1)
    #         ws.send("Hello %d" % i)
    #     time.sleep(1)
    #     ws.close()
    #     print("thread terminating...")
    # _thread.start_new_thread(run, ())


if __name__ == "__main__":
    # websocket.enableTrace(True)
    ws = websocket.WebSocketApp("ws://localhost:8080/echo",
                                on_open=on_open,
                                on_message=on_message,
                                on_error=on_error,
                                on_close=on_close)

    # skipping utf validation makes it a little faster
    ws.run_forever(skip_utf8_validation=True)
