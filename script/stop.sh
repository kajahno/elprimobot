#!/usr/bin/env bash
set -e

kill $( ps -awxwe | grep elprimobot-linuxstatic | grep "$ELPRIMOBOT_BIN_PATH" | awk '{ print $1 }' ) && echo "app stopped" || echo 'no running service found'
