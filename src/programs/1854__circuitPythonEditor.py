from helper import init, subscription, batch, MY_ID_STR, check_server_connection, get_my_id_str, prehook, listen
from mfrc522 import SimpleMFRC522
from watchedserial import WatchedReaderThread
from PIL import Image, ImageDraw, ImageFont
import tkinter as tk
from tkinter.scrolledtext import ScrolledText
import pyudev
import glob
import time
import queue
import threading
import serial
import requests
import os
import traceback

rfid_sensor_updates = queue.Queue()
room_rfid_code_updates = queue.Queue()
serial_updates = queue.Queue()
room_ui_requests = queue.Queue()
rfid_to_code = {}
serial_log_cache = ""
follow_log = True
SERIAL_PORT_1 = "/dev/ttyACM0"
SERIAL_PORT_2 = "/dev/ttyACM1"
NO_RFID = ""
ROOM_REQUEST_SAVE = "SAVE"
ROOM_REQUEST_PRINT = "PRINT"
ROOM_REQUEST_PRINT_FRONT = "PRINT_FRONT"
# Print image generation stuff
PAPER_WIDTH = 570
PAGE_SIZE = 440
MARGIN = 30
TITLE_FONT_SIZE = 36
FONT_PATH_BASE = '/usr/share/fonts/' # '/Users/jacobhaip/Library/Fonts/'
FONT_PATH = FONT_PATH_BASE + 'Inconsolata-SemiCondensedMedium.ttf'

active_rfid = NO_RFID
context = pyudev.Context()
monitor = pyudev.Monitor.from_netlink(context)
monitor.filter_by('block')

code_filename = "/media/pi/CIRCUITPY/code.py"

def load_code_to_editor():
    if len(glob.glob(code_filename)) == 1:
        label_boardstatus.config(text="Connected.")
        with open(code_filename, "r+") as f:
            data = f.read()
            print(data)
            editor.delete("1.0", tk.END)
            editor.insert(tk.END, data)

def log_event(action, device):
    if 'ID_FS_TYPE' in device and device.get('ID_FS_LABEL') == 'CIRCUITPY':
        print(action)
        if action == "remove":
            if active_rfid == NO_RFID:
                label_boardstatus.config(text="No device.")
                editor.delete("1.0", tk.END)
        elif action == "add":
            label_boardstatus.config(text="Connecting...")
            time.sleep(0.5)
            load_code_to_editor()

def onclick_save():
    global room_ui_requests
    print("saving")
    newcode = editor.get("1.0", "end")
    print(newcode)
    if active_rfid and active_rfid in rfid_to_code:
        active_program_name = rfid_to_code[active_rfid][0]
        room_ui_requests.put((ROOM_REQUEST_SAVE, active_rfid, active_program_name, newcode))
    if len(glob.glob(code_filename)) != 1:
        print("cannot save")
    else:
        with open(code_filename, "r+") as f:
            f.seek(0)
            f.write(newcode)
            f.truncate()
    print("done saving")

def onclick_print():
    global room_ui_requests
    code = editor.get("1.0", "end")
    if active_rfid and active_rfid in rfid_to_code:
        active_program_name = rfid_to_code[active_rfid][0]
        room_ui_requests.put((ROOM_REQUEST_PRINT, active_rfid, active_program_name, code))
    else:
        print("not printing because no active_rfid or not in code")

def onclick_print_front():
    global room_ui_requests
    if active_rfid and active_rfid in rfid_to_code:
        active_program_name = rfid_to_code[active_rfid][0]
        room_ui_requests.put((ROOM_REQUEST_PRINT_FRONT, active_rfid, active_program_name, ""))
    else:
        print("not printing because no active_rfid or not in code")

def onclick_clearserial():
    global serialout, serial_log_cache
    serial_log_cache = ""
    serialout.delete("1.0", tk.END)

def onclick_followserial():
    global button_followserial, follow_log
    if button_followserial.config('relief')[-1] == 'sunken':
        button_followserial.config(relief="raised")
        follow_log = True
    else:
        button_followserial.config(relief="sunken")
        follow_log = False

def generate_and_upload_code_image(text):
    fnt = ImageFont.truetype(FONT_PATH, 16)
    lines = text.split("\n")
    img_height = 20*(len(lines)+2)
    img = Image.new('RGB', (PAPER_WIDTH, img_height), color=(255, 255, 255))
    d = ImageDraw.Draw(img)

    for y in range(int(img_height/PAGE_SIZE) + 1):
        d.line((0, y*PAGE_SIZE, PAPER_WIDTH, y*PAGE_SIZE), fill=50)

    for i in range(len(lines)):
        d.text((0, i*20), lines[i], font=fnt, fill=(0,0,0))
    img.save('/tmp/1854-code.png')
    print("done generating code image")
    url = "http://{}:5000/file".format(os.getenv('PROG_SPACE_SERVER_URL', "localhost"))
    files = {'myfile': open('/tmp/1854-code.png', 'rb')}
    requests.post(url, files=files)
    print("done posting image")

def generate_and_upload_code_front_image(programId):
    img = Image.new('RGB', (PAGE_SIZE, PAPER_WIDTH), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    # Page edges
    d.line((0, 0, 0, PAPER_WIDTH), fill=50)
    d.line((PAGE_SIZE - 1, 0, PAGE_SIZE - 1, PAPER_WIDTH), fill=50)
    # Card title
    fnt_title = ImageFont.truetype(FONT_PATH, TITLE_FONT_SIZE)
    fnt_description = ImageFont.truetype(FONT_PATH, 24)
    d.text((MARGIN, 0), "#{}".format(programId), font=fnt_title, fill=(0, 0, 0))
    # Drawing rectange
    d.rectangle([(MARGIN, TITLE_FONT_SIZE+5), (PAGE_SIZE - MARGIN, PAPER_WIDTH/2 + TITLE_FONT_SIZE+5)], outline=128, width=3)
    # Description
    d.text((MARGIN, PAPER_WIDTH/2 + TITLE_FONT_SIZE+5 + 10), "DESCRIPTION:", font=fnt_description, fill=128)

    img_r=img.rotate(90,  expand=1)
    img_r.save('/tmp/1854-front.png')
    print("done generating front image")
    url = "http://{}:5000/file".format(os.getenv('PROG_SPACE_SERVER_URL', "localhost"))
    files = {'myfile': open('/tmp/1854-front.png', 'rb')}
    requests.post(url, files=files)
    print("done posting front image")

def room_thread():
    global room_ui_requests

    @prehook
    def room_prehook_callback():
        batch([{"type": "death", "fact": [["id", get_my_id_str()]]}])

    @subscription(["$ $ paper $targetId has RFID $rfid", "$ $ $targetName has paper ID $targetId", "$ $ $targetName has source code $sourceCode"])
    def rfid_source_code_callback(results):
        rfid_to_source_code = {}
        if results:
            for result in results:
                source_code = result["sourceCode"].replace(chr(9787), '"')
                rfid_to_source_code[result["rfid"]] = (result["targetName"], source_code)
        room_rfid_code_updates.put(rfid_to_source_code)
        print("updated RFID to source code map")

    init(__file__, skipListening=True)

    while True:
        listen(blocking=False)
        try:
            message = room_ui_requests.get(block=False)
            if message is None:
                print("received none message in room thread, exiting")
                return
            req_type = message[0]
            active_rfid = message[1]
            active_program_name = message[2]
            source_code = message[3]
            clean_source_code = source_code.replace('"', chr(9787))
            if req_type == ROOM_REQUEST_SAVE:
                batch([
                    {"type": "claim", "fact": [
                        ["id", get_my_id_str()],
                        ["id", "0"],
                        ["text", "wish"],
                        ["text", active_program_name],
                        ["text", "has"],
                        ["text", "source"],
                        ["text", "code"],
                        ["text", clean_source_code],
                    ]}
                ])
            elif req_type == ROOM_REQUEST_PRINT:
                generate_and_upload_code_image(
                    "Code for {}\n\n{}".format(active_program_name, clean_source_code)
                )
                batch([
                    {"type": "claim", "fact": [
                        ["id", get_my_id_str()],
                        ["id", "0"],
                        ["text", "wish"],
                        ["text", "1854-code.png"],
                        ["text", "would"],
                        ["text", "be"],
                        ["text", "thermal"],
                        ["text", "printed"],
                        ["text", "on"],
                        ["text", "epson"],
                    ]}
                ])
            elif req_type  == ROOM_REQUEST_PRINT_FRONT:
                generate_and_upload_code_front_image(active_program_name)
                batch([
                    {"type": "claim", "fact": [
                        ["id", get_my_id_str()],
                        ["id", "0"],
                        ["text", "wish"],
                        ["text", "1854-front.png"],
                        ["text", "would"],
                        ["text", "be"],
                        ["text", "thermal"],
                        ["text", "printed"],
                        ["text", "on"],
                        ["text", "epson"],
                    ]}
                ])
        except queue.Empty:
            pass
        time.sleep(0.1)

def rfid_sensor_thread():
    global rfid_sensor_updates
    reader = SimpleMFRC522()
    last_read_value = None
    no_rfid_detected = False
    last_sent_value = None
    while True:
        id, text = reader.read_no_block()
        if id:
            no_rfid_detected = False
            if last_sent_value != id:
                last_sent_value = id
                print("RFID ID: {}".format(str(hex(id))[2:10]))
                rfid_sensor_updates.put(str(hex(id))[2:10])
        else:
            if not last_read_value and not no_rfid_detected:
                no_rfid_detected = True
                if last_sent_value != id:
                    last_sent_value = id
                    print("RFID ID: None")
                    rfid_sensor_updates.put(NO_RFID)
        last_read_value = id
        time.sleep(0.1)

def serial_thread(port):
    global serial_updates

    class MyPacket(serial.threaded.LineReader):
        def handle_packet(self, packet):
            print(packet)
            serial_updates.put(packet.decode("utf-8") + "\n")

    class MyWatchedReaderThread(WatchedReaderThread):
        def handle_reconnect(self):
            print("Reconnected")
            serial_updates.put("~~~Reconnected\n")

        def handle_disconnect(self, error):
            print("Disconnected")
            serial_updates.put("~~~Disconnected\n")

    while True:
        try:
            ser = serial.Serial(port, baudrate=9600)
            with MyWatchedReaderThread(ser, MyPacket) as protocol:
                while True:
                    time.sleep(1)
        except Exception as e:
            print("Error in serial thread {}".format(port))
            print(traceback.format_exc())
            print("sleeping for 20 seconds")
            time.sleep(20)

def room_rfid_code_updates_callback():
    global rfid_to_code, room_rfid_code_updates, window
    try:
        message = room_rfid_code_updates.get(block=False)
    except queue.Empty:
        window.after(200, room_rfid_code_updates_callback)  # let's try again later
        return
    if message is not None:
        rfid_to_code = message
        window.after(200, room_rfid_code_updates_callback)

def rfid_sensor_updates_callback():
    global rfid_sensor_updates, window, label_rfid_status, editor, active_rfid
    try:
        message = rfid_sensor_updates.get(block=False)
    except queue.Empty:
        window.after(101, rfid_sensor_updates_callback)  # let's try again later
        return
    if message is not None: # None means exit the thread. Different than empty string!
        active_rfid = message
        if active_rfid == NO_RFID:
            label_rfid_status.config(text="No RFID")
        else:
            label_rfid_status.config(text="{}".format(active_rfid))
            if active_rfid in rfid_to_code:
                new_code = rfid_to_code[active_rfid][1] # 0 = program name, 1 = source code
                editor.delete("1.0", tk.END)
                editor.insert(tk.END, new_code)
                onclick_save()
        window.after(101, rfid_sensor_updates_callback)

def serial_updates_callback():
    global serial_updates, window, serialout, serial_log_cache, follow_log
    max_messages_to_drain = 100
    while max_messages_to_drain > 0:  # drain the queue
        max_messages_to_drain -= 1
        try:
            message = serial_updates.get(block=False)
        except queue.Empty:
            window.after(100, serial_updates_callback)  # let's try again later
            return
        if message is not None:
            serialout.delete("1.0", tk.END)
            serial_log_cache += message
            serialout.insert(tk.END, serial_log_cache)
            if follow_log:
                serialout.see(tk.END)
    # fallback if more than 100 messages where drained
    window.after(10, serial_updates_callback)

observer = pyudev.MonitorObserver(monitor, log_event)
observer.start()

window = tk.Tk()
# window.attributes("-fullscreen", True)

menubar = tk.Frame(master=window, width=200, height=50)
menubar.pack(fill='x', side=tk.TOP, expand=False)
button_save = tk.Button(menubar, text="SAVE", command=onclick_save)
button_save.pack(side=tk.LEFT)
button_print = tk.Button(menubar, text="PRINT CODE", command=onclick_print)
button_print.pack(side=tk.LEFT)
button_print_front = tk.Button(menubar, text="PRINT FRONT", command=onclick_print_front)
button_print_front.pack(side=tk.LEFT)
button_clearserial = tk.Button(menubar, text="CLEAR LOG", command=onclick_clearserial)
button_clearserial.pack(side=tk.LEFT)
button_followserial = tk.Button(menubar, text="FOLLOW LOG", relief="raised", command=onclick_followserial)
button_followserial.pack(side=tk.LEFT)

label_rfid_status = tk.Label(menubar, fg="blue")
label_rfid_status.pack(side=tk.RIGHT)

label_boardstatus = tk.Label(menubar, fg="green")
label_boardstatus.pack(side=tk.RIGHT)

body = tk.Frame(master=window, width=200, height=200, bg="white")
body.pack(fill=tk.BOTH, side=tk.TOP, expand=True)

editorside = tk.Frame(master=body, width=200, height=100, bg="red")
editor = ScrolledText(editorside)
editor.pack(fill=tk.BOTH, expand=True)
editorside.pack(fill=tk.BOTH, side=tk.LEFT, expand=True)

frame2 = tk.Frame(master=body, width=100, bg="yellow")
serialout = ScrolledText(frame2)
serialout.pack(fill=tk.BOTH, expand=True)
frame2.pack(fill=tk.BOTH, side=tk.LEFT, expand=True)

accept_secret = False
secret = ""
def key(event):
    global accept_secret, secret
    print(event)
    print(event.state)
    print(event.char)
    if accept_secret:
        if event.state == 0:
            secret += event.char
        elif event.state == 4 and event.keysym == '2':
            print("READ RFID: {}".format(secret))
            rfid_sensor_updates.put(secret)
            secret = ""
            accept_secret = False
        return "break"
    elif event.state == 4 and event.keysym == '1':
        accept_secret = True

window.bind("<Key>", key)
editor.bind("<Key>", key)
serialout.bind("<Key>", key)

load_code_to_editor()

threading.Thread(target=room_thread).start()
threading.Thread(target=rfid_sensor_thread).start()
threading.Thread(target=serial_thread, args=(SERIAL_PORT_1,)).start()
threading.Thread(target=serial_thread, args=(SERIAL_PORT_2,)).start()
window.after(200, room_rfid_code_updates_callback)
window.after(101, rfid_sensor_updates_callback)
window.after(100, serial_updates_callback)
window.mainloop()

# Cleanup
rfid_sensor_updates.put(None)
room_rfid_code_updates.put(None)
GPIO.cleanup() # for MFRC522
