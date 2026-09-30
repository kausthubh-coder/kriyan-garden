#!/usr/bin/env bash
# Usage: ./shoot.sh a-today   (writes shots/<name>-desktop.png and shots/<name>-mobile.png)
CH="/c/Program Files/Google/Chrome/Application/chrome.exe"
DIR="$(cd "$(dirname "$0")" && pwd -W)"
for n in "$@"; do
  "$CH" --headless=new --disable-gpu --hide-scrollbars --window-size=1440,900 --virtual-time-budget=6000 --user-data-dir="$TEMP/kriyan-shots-prof" --screenshot="$DIR/shots/$n-desktop.png" "file:///$DIR/$n.html" >/dev/null 2>&1
  "$CH" --headless=new --disable-gpu --hide-scrollbars --window-size=1000,900 --virtual-time-budget=6000 --user-data-dir="$TEMP/kriyan-shots-prof" --screenshot="$DIR/shots/$n-mobile.png" "file:///$DIR/$n.html?m" >/dev/null 2>&1
done
ls -la "$DIR/shots"
