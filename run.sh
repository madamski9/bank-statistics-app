#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

BOLD='\033[1m'
DIM='\033[2m'
RED='\033[31m'
CYAN='\033[36m'
GREEN='\033[32m'
RESET='\033[0m'

platform="${1:-}"

case "$platform" in
  ios)
    exec ./scripts/run-ios.sh "${@:2}"
    ;;
  android)
    exec ./scripts/run-android.sh
    ;;
  *)
    printf "${RED}${BOLD}Usage:${RESET} ./run.sh ${CYAN}ios${RESET} [device name or UDID]|${GREEN}android${RESET}\n"
    exit 1
    ;;
esac
