import asyncio
import websockets
import base64
import cv2
import numpy as np
import time

"""
A test of latency for sending b64 encoded images of websockets

1. source.html (open in a browser window)
    Get webcam frame in JS. Encode frame as b64 and send via WS
2. cv.py (started from the command line, Python 3.9)
    Recv frame in ws message
    convert to OpenCV message
    run CV
    encode resulting image back to b64 and send on WS
3. viewer.html (open in a different browser window)
    recv b64 image from WS. Rendering on page.

Results when running everython on one local computer.
200x200px image -> 30 fps
480x320px image -> 10 fps max
720x480px image -> 1  fps max

things could possibly be faster if I was using binary data
but online sources say the bottleneck is probably network latency.
"""

def readb64(uri):
   encoded_data = uri.split(',')[1]
   nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
   img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
   return img

def create_echo(queue):
    async def echo(websocket):
        async for message in websocket:
            # run cv on message
            print(f"recv: message")
            start = time.time()
            # serialized_img = f"Serialized {message}"
            img = readb64(message)
            edges = cv2.Canny(img,100,200)
            retval, buffer = cv2.imencode('.jpg', edges)
            serialized_img = base64.b64encode(buffer)
            queue.put_nowait(serialized_img.decode("utf-8"))
            print(f"processing time: {time.time()-start} s")
    return echo

def create_send_loop(queue):
    async def send_loop(websocket):
        # consume queue
        while True:
            serialized_img = await queue.get()
            draw_commmands = serialized_img
            await websocket.send(draw_commmands)
            # await websocket.send("test")
            # await asyncio.sleep(1)
    return send_loop

async def main():
    queue = asyncio.Queue()
    server1 = await websockets.serve(create_echo(queue), 'localhost', 8765)
    server2 = await websockets.serve(create_send_loop(queue), 'localhost', 8766)
    await asyncio.gather(server1.wait_closed(), server2.wait_closed())

asyncio.run(main())