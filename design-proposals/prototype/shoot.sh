#!/usr/bin/env bash
# Usage: ./shoot.sh name WIDTHxHEIGHT "hash steps" [phone]
CH="/c/Program Files/Google/Chrome/Application/chrome.exe"
DIR="$(cd "$(dirname "$0")" && pwd -W)"; mkdir -p "$DIR/shots"
PAGE="test.html"; [ "$4" = "phone" ] && PAGE="phone.html?test"
"$CH" --headless=new --disable-gpu --hide-scrollbars --window-size="${2/x/,}" --virtual-time-budget=4000 --user-data-dir="$TEMP/kriyan-shots-prof" --screenshot="$DIR/shots/$1.png" "http://localhost:3210/$PAGE#$3" >/dev/null 2>&1
