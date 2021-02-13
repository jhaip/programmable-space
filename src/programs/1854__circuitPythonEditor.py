from helper import init, subscription, batch, MY_ID_STR, check_server_connection, get_my_id_str, prehook
from mfrc522 import SimpleMFRC522
import tkinter as tk
from tkinter.scrolledtext import ScrolledText
import pyudev
import glob
import time
import queue
import threading

rfid_sensor_updates = queue.Queue()
room_rfid_code_updates = queue.Queue()
rfid_to_code = {}
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
            label_boardstatus.config(text="No device.")
            editor.delete("1.0", tk.END)
        elif action == "add":
            label_boardstatus.config(text="Connecting...")
            time.sleep(0.5)
            load_code_to_editor()

def onclick_save():
    print("saving")
    newcode = editor.get("1.0", "end")
    print(newcode)
    if len(glob.glob(code_filename)) != 1:
        print("cannot save")
    else:
        with open(code_filename, "r+") as f:
            f.seek(0)
            f.write(newcode)
            f.truncate()
    print("done saving")

def onclick_print():
    print("TODO: print")

def room_thread():
    @prehook
    def room_prehook_callback():
        batch([{"type": "death", "fact": [["id", get_my_id_str()]]}])

    @subscription(["$ $ paper $targetId has RFID $rfid", "$ $ $targetName has paper ID $targetId", "$ $ $targetName has source code $sourceCode"])
    def rfid_source_code_callback(results):
        rfid_to_source_code = {}
        if results:
            for result in results:
                rfid_to_source_code[result["rfid"]] = result["sourceCode"]
        room_rfid_code_updates.put(rfid_to_source_code)
        print("updated RFID to source code map")

    init(__file__)

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
                    rfid_sensor_updates.put("")
        last_read_value = id
        time.sleep(0.1)

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
    global rfid_sensor_updates, window, label_rfid_status, editor
    try:
        message = rfid_sensor_updates.get(block=False)
    except queue.Empty:
        window.after(101, rfid_sensor_updates_callback)  # let's try again later
        return
    if message is not None: # None means exit the thread. Different than empty string!
        new_rfid_sensor_value = message
        if new_rfid_sensor_value == "":
            label_rfid_status.config(text="No RFID")
        else:
            label_rfid_status.config(text="{}".format(new_rfid_sensor_value))
            if new_rfid_sensor_value in rfid_to_code:
                new_code = rfid_to_code[new_rfid_sensor_value]
                editor.delete("1.0", tk.END)
                editor.insert(tk.END, new_code)
                # onclick_save()
        window.after(101, rfid_sensor_updates_callback)

observer = pyudev.MonitorObserver(monitor, log_event)
observer.start()

window = tk.Tk()
window.attributes("-fullscreen", True)

menubar = tk.Frame(master=window, width=200, height=50)
menubar.pack(fill='x', side=tk.TOP, expand=False)
button_save = tk.Button(menubar, text="SAVE", command=onclick_save)
button_save.pack(side=tk.LEFT)
button_print = tk.Button(menubar, text="PRINT", command=onclick_print)
button_print.pack(side=tk.LEFT)

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
ScrolledText(frame2).pack(fill=tk.BOTH, expand=True)
frame2.pack(fill=tk.BOTH, side=tk.LEFT, expand=True)

load_code_to_editor()

threading.Thread(target=room_thread).start()
threading.Thread(target=rfid_sensor_thread).start()
window.after(200, room_rfid_code_updates_callback)
window.after(101, rfid_sensor_updates_callback)
window.mainloop()

# Cleanup
rfid_sensor_updates.put(None)
room_rfid_code_updates.put(None)
GPIO.cleanup() # for MFRC522