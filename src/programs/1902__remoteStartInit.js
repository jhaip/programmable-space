const { room, run, MY_ID_STR } = require('../helpers/helper')(__filename);

let start_g5 = `
cd /home/jacob/programmable-space
pkill -f "1601__frame-to-papers.go"
pkill -f "exe/1601__frame-to-papers"
pkill -f "processing/graphics"
export PATH=/home/jacob/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin:/usr/local/go/bin
export DISPLAY=:1
# export HEADLESS_CV=true
export CV_PROGRAM_ID="1599"
export CV_CAMERA_ID="1994"
sleep 2
v4l2-ctl \
      --set-ctrl=white_balance_temperature_auto=0 \
      --set-ctrl=white_balance_temperature=3000 \
      --set-ctrl=focus_auto=0
v4l2-ctl --device /dev/video0 --set-fmt-video=width=1920,height=1080,pixelformat=MPEG
sleep 2
cd src/programs
PROG_SPACE_SERVER_URL="192.168.1.34" /usr/local/go/bin/go run 1601__frame-to-papers.go 0 &
cd ../..
/home/jacob/processing-3.5.4/processing-java --output=/home/jacob/tmp/processing/ --sketch=src/processing/graphics --force --run 1994
`;

room.assert(`wish`, ["text", start_g5.replace(/"/g, String.fromCharCode(9787))], `would be running on`, ["text", "jacob-G5-5090"])

room.cleanupOtherSource(MY_ID_STR);
run();

