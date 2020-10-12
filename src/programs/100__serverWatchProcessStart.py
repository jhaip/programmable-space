from helper2 import init, claim, retract, prehook, subscription, batch, check_server_connection
import helper2
import logging
import time
import os
import sys
import os, signal

my_pid = int(os.getpid())
logging.info(my_pid)

def check_kill_process(pstring):
    for line in os.popen("ps ax | grep \"" + pstring + "\" | grep -v grep"):
        fields = line.split()
        pid = fields[0]
        if int(pid) == my_pid:
            logging.info("It's my own PID!")
        else:
            logging.info("not my PID {}".format(pid))
            os.kill(int(pid), signal.SIGKILL)

helper2.rpc_url = "192.168.1.34"

if len(sys.argv) != 2:
    logging.info("Expected a single argument of the process to run!")
    sys.exit()

process_name = sys.argv[1]

@prehook
def my_prehook():
    # Kill process
    logging.info("killing process")
    # print("pkill -f \"{}\"".format(process_name))
    # os.system("pkill -f \"{}\"".format(process_name))
    check_kill_process(process_name)
    # Restart process
    logging.info("starting new process: python3 {} &".format(process_name))
    os.system("python3 {} &".format(process_name))

init(__file__, skipListening=True)

while True:
    time.sleep(10)
    logging.info("checking server connection")
    check_server_connection()
