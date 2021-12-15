const { room, run, MY_ID_STR } = require('../helpers/helper')(__filename);

const TARGET_CODE_MAP = {
"jacob-G5-5090": `
cd /home/jacob/programmable-space
pkill -f "1601__frame-to-papers.go"
pkill -f "exe/1601__frame-to-papers"
pkill -f "processing/graphics"
export PATH=/home/jacob/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin:/usr/local/go/bin
export DISPLAY=:0
export HEADLESS_CV=true
export CV_PROGRAM_ID="1599"
export CV_CAMERA_ID="1994"
sleep 2
v4l2-ctl \
      --set-ctrl=white_balance_temperature_auto=0 \
      --set-ctrl=white_balance_temperature=4500 \
      --set-ctrl=focus_auto=0
v4l2-ctl --device /dev/video0 --set-fmt-video=width=1920,height=1080,pixelformat=MPEG
sleep 2
cd src/programs
PROG_SPACE_SERVER_URL="192.168.1.34" /usr/local/go/bin/go run 1601__frame-to-papers.go 0 &
cd ../..
/home/jacob/processing-3.5.4/processing-java --output=/home/jacob/tmp/processing/ --sketch=src/processing/graphics --force --run 1994
`,

"haippi3": `
pkill -f '650__keyboard'
pkill -f 'processing/graphics'
export DISPLAY=:0
export PROG_SPACE_SERVER_URL='192.168.1.34'
python3 src/programs/232.py &
sudo python3 src/programs/650__keyboard.py &
/usr/local/bin/processing-java --output=/tmp/processing/ --sketch=src/processing/graphics --force --run 1999 &
`,

"haippi5": `
pkill -f programs/793__textToSpeech.js
pkill -f programs/792__deepspeech.py
sudo PROG_SPACE_SERVER_URL='192.168.1.34' node /home/pi/programmable-space/src/programs/793__textToSpeech.js &
sudo -E python3 /home/pi/programmable-space/src/programs/792__deepspeech.py -m /home/pi/deepspeech-0.7.4-models.tflite -s /home/pi/deepspeech-0.7.4-models.scorer &
`,

"haippi7": `
pkill -f "processing/graphics"
pkill -f "python3"
v4l2-ctl \
  --set-ctrl=brightness=10 \
  --set-ctrl=contrast=0 \
  --set-ctrl=saturation=-100 \
  --set-ctrl=sharpness=128 \
  --set-ctrl=exposure_absolute=50
export DISPLAY=:0
export PROG_SPACE_SERVER_URL="192.168.1.34"
unclutter -idle 0 &
python3 src/programs/1620__seeLaser.py 1998 &
/home/pi/processing-3.5.3/processing-java --output=/tmp/processing/ --sketch=src/processing/graphics --force --present 1998
`,

"haippi9": `
sudo pkill -f '1855__thermalPrinterEscpos.py'
sudo -E python3 src/programs/1855__thermalPrinterEscpos.py &
`,
};

for (target in TARGET_CODE_MAP) {
  room.retractAll(`wish $ would be running on`, ["text", target]);
  room.assert(`wish`, ["text", TARGET_CODE_MAP[target].replace(/"/g, String.fromCharCode(9787))], `would be running on`, ["text", target]);
}
room.cleanupOtherSource(MY_ID_STR);
run();

