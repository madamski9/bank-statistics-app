#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
CONVEX_DIR="$ROOT/services/convex"
MOBILE_DIR="$ROOT/mobile"

BOLD='\033[1m'
DIM='\033[2m'
RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
CYAN='\033[36m'
RESET='\033[0m'

CONVEX_PID=""

usage() {
  printf "\n${BOLD}Usage:${RESET} ./run.sh ${CYAN}ios${RESET} [device name]|${GREEN}android${RESET}|${YELLOW}web${RESET}|start\n\n"
  printf "  ${CYAN}ios${RESET} [device]  Build and run on a simulator/device ${DIM}(macOS + Xcode)${RESET}\n"
  printf "  ${GREEN}android${RESET}      Build and run on an emulator/device\n"
  printf "  ${YELLOW}web${RESET}          Run in a browser\n"
  printf "  start        Start the bundler only ${DIM}(a dev build is already installed)${RESET}\n\n"
}

platform="${1:-}"

if [[ ! "$platform" =~ ^(ios|android|web|start)$ ]]; then
  printf "${RED}${BOLD}✗ Unknown platform:${RESET} %s\n" "${platform:-<none>}"
  usage
  exit 1
fi

# `bunx convex dev`'s actual node process is a grandchild of $CONVEX_PID (the
# backgrounded subshell), and the local backend binary is a further child of
# that — killing only $CONVEX_PID leaves both running and the terminal
# spamming reconnect attempts, as happened before. Sweep by command pattern
# instead, which reaches the whole tree regardless of how it's nested.
cleanup() {
  if [[ -n "$CONVEX_PID" ]]; then
    kill "$CONVEX_PID" 2>/dev/null || true
    wait "$CONVEX_PID" 2>/dev/null || true
  fi
  pkill -f "$CONVEX_DIR/node_modules/.bin/convex dev" 2>/dev/null || true
  pkill -f 'convex-local-backend --port' 2>/dev/null || true
}
on_error() {
  printf "\n${RED}${BOLD}✗ Something went wrong${RESET} ${DIM}— see the output above${RESET}\n"
}
trap cleanup EXIT INT TERM
trap on_error ERR

print_step() {
  printf "\n${BOLD}${CYAN}BankStats${RESET} ${BOLD}· %s${RESET}\n" "$1"
  printf "${DIM}────────────────────────${RESET}\n\n"
}

check_bun() {
  if ! command -v bun &> /dev/null; then
    printf "${RED}✗ bun is not installed${RESET} ${DIM}(https://bun.sh)${RESET}\n"
    exit 1
  fi
}

# Everything hoists into the root node_modules (bun workspace), so one
# timestamp comparison covers mobile, packages/*, and services/* alike.
deps_out_of_date() {
  [[ ! -d "$ROOT/node_modules" ]] && return 0
  [[ "$ROOT/bun.lock" -nt "$ROOT/node_modules" ]] && return 0
  return 1
}

ensure_deps() {
  if deps_out_of_date; then
    bash "$ROOT/scripts/setup-mobile.sh"
  fi
}

start_convex() {
  printf "${YELLOW}▸${RESET} Starting Convex dev server\n"
  (cd "$CONVEX_DIR" && bunx convex dev) &
  CONVEX_PID=$!

  # No health endpoint to poll — the push either fails loudly above, or it
  # doesn't. Give it a moment to do the former before moving on.
  sleep 3
  if ! kill -0 "$CONVEX_PID" 2>/dev/null; then
    printf "${RED}✗ convex dev exited${RESET} ${DIM}— see the output above${RESET}\n"
    CONVEX_PID=""
    exit 1
  fi
}

main() {
  print_step "$platform"
  check_bun
  ensure_deps
  start_convex

  case "$platform" in
    ios)
      bash "$ROOT/scripts/run-mobile.sh" ios "${2:-}"
      ;;
    *)
      bash "$ROOT/scripts/run-mobile.sh" "$platform"
      ;;
  esac
}

main "$@"
