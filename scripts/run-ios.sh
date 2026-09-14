#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

BOLD='\033[1m'
DIM='\033[2m'
CYAN='\033[36m'
YELLOW='\033[33m'
GREEN='\033[32m'
RED='\033[31m'
RESET='\033[0m'

device="${1:-}"
device_arguments=(--device)

if [[ -n "$device" ]]; then
  device_arguments+=("$device")
fi

cleanup() {
  kill "$CONVEX_PID" 2>/dev/null || true
  pkill -f 'convex-local-backend --port' 2>/dev/null || true
}
on_error() {
  printf "\n${RED}${BOLD}✗ Something went wrong${RESET} ${DIM}— see the output above${RESET}\n"
}
trap cleanup EXIT INT TERM
trap on_error ERR

printf "\n${BOLD}${CYAN}BankStats${RESET} ${BOLD}· iOS${RESET}\n"
printf "${DIM}────────────────────────${RESET}\n\n"

printf "${YELLOW}▸${RESET} Starting Convex dev server\n"
(cd "$ROOT/services/convex" && bunx convex dev) &
CONVEX_PID=$!

if [[ -n "$device" ]]; then
  printf "${YELLOW}▸${RESET} Building and launching on ${BOLD}%s${RESET} ${DIM}(this can take a while on first run)${RESET}\n\n" "$device"
else
  printf "${YELLOW}▸${RESET} Select an iPhone or simulator in the Expo device picker\n"
  printf "${DIM}Connect and unlock a physical iPhone before continuing${RESET}\n\n"
fi

cd "$ROOT/mobile"
bunx expo run:ios "${device_arguments[@]}"

printf "\n${GREEN}${BOLD}✓ Running${RESET} ${DIM}— Metro and Convex are live, edit away${RESET}\n"
