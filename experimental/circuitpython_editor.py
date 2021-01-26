import tkinter as tk
from tkinter.scrolledtext import ScrolledText
import pyudev
import glob
import time

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
        if 'ID_FS_TYPE' in device and device.get('ID_FS_LABEL') == 'CIRCUI$
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

def onclick_new():
        print("TODO: new")

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
button_new = tk.Button(menubar, text="NEW", command=onclick_new)
button_new.pack(side=tk.LEFT)

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

window.mainloop()
