#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../mobile"

BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
RESET='\033[0m'

cleanup() {
  kill "$CONVEX_PID" 2>/dev/null || true
  pkill -f 'convex-local-backend --port' 2>/dev/null || true
}
on_error() {
  printf "\n${RED}${BOLD}✗ Something went wrong${RESET} ${DIM}— see the output above${RESET}\n"
}
trap cleanup EXIT INT TERM
trap on_error ERR

printf "\n${BOLD}${GREEN}BankStats${RESET} ${BOLD}· Android${RESET}\n"
printf "${DIM}────────────────────────────${RESET}\n\n"

printf "${YELLOW}▸${RESET} Starting Convex dev server\n"
bunx convex dev &
CONVEX_PID=$!

printf "${YELLOW}▸${RESET} Building and launching the Android app ${DIM}(this can take a while on first run)${RESET}\n\n"
bunx expo run:android

printf "\n${GREEN}${BOLD}✓ Running${RESET} ${DIM}— Metro and Convex are live, edit away${RESET}\n"
