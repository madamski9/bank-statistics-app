#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="$ROOT/mobile"

BOLD='\033[1m'
DIM='\033[2m'
RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
CYAN='\033[36m'
RESET='\033[0m'

platform="${1:-}"
device="${2:-}"

usage() {
  printf "\n${BOLD}Usage:${RESET} ./scripts/run-mobile.sh ${CYAN}ios${RESET}|${GREEN}android${RESET}|${YELLOW}web${RESET}|start\n\n"
  printf "  ${CYAN}ios${RESET}      Build and run on a simulator/device (macOS + Xcode)\n"
  printf "  ${GREEN}android${RESET}  Build and run on an emulator/device\n"
  printf "  ${YELLOW}web${RESET}      Run in a browser\n"
  printf "  start    Start the bundler only ${DIM}(a dev build is already installed)${RESET}\n\n"
}

if [[ ! "$platform" =~ ^(ios|android|web|start)$ ]]; then
  printf "${RED}${BOLD}✗ Unknown platform:${RESET} %s\n" "${platform:-<none>}"
  usage
  exit 1
fi

if [[ ! -d "$MOBILE_DIR/node_modules" ]]; then
  printf "${YELLOW}▸${RESET} Dependencies not installed — running setup\n"
  bash "$ROOT/scripts/setup-mobile.sh"
fi

cd "$MOBILE_DIR"

EXPO_PORT="${EXPO_PORT:-8081}"
DEV_HOST=""

# Forwards Metro's port over USB so a physical Android device can reach the
# bundler at localhost, same as the simulator does. Convex itself needs no
# tunnel — this project's mobile lane points at a cloud deployment, which the
# device reaches over the internet like any other API.
setup_dev_host() {
  if ! command -v adb &> /dev/null; then
    printf "${DIM}  adb not found — skipping port forwarding (a Wi-Fi device will need the LAN address)${RESET}\n"
    return 1
  fi

  local serial
  serial="$(adb get-serialno 2>/dev/null || true)"

  if [[ -z "$serial" || "$serial" == "unknown" ]]; then
    printf "${YELLOW}⚠${RESET}  No device visible to adb — skipping port forwarding\n"
    return 1
  fi

  if [[ "$serial" == emulator-* ]]; then
    DEV_HOST="10.0.2.2"
    printf "${GREEN}✓${RESET} Emulator ${BOLD}%s${RESET} reaches this machine as ${BOLD}%s${RESET} ${DIM}(Metro %s)${RESET}\n" "$serial" "$DEV_HOST" "$EXPO_PORT"
    return 0
  fi

  if adb reverse "tcp:${EXPO_PORT}" "tcp:${EXPO_PORT}" &> /dev/null; then
    DEV_HOST="localhost"
    printf "${GREEN}✓${RESET} Forwarded ${BOLD}localhost:%s${RESET} to %s\n" "$EXPO_PORT" "$serial"
    return 0
  fi

  printf "${YELLOW}⚠${RESET}  adb reverse failed — the app may not reach Metro\n"
  return 1
}

warn_on_missing_convex_url() {
  local configured
  configured="$(grep -hE '^EXPO_PUBLIC_CONVEX_URL=' "$MOBILE_DIR/.env.local" 2>/dev/null | tail -1 | cut -d= -f2-)"

  if [[ -z "$configured" ]]; then
    printf "${YELLOW}⚠${RESET}  EXPO_PUBLIC_CONVEX_URL is empty in ${BOLD}mobile/.env.local${RESET} — every screen that reads data will fail\n"
    printf "${DIM}  Paste in the URL 'bunx convex dev' prints, then restart with a cleared cache (bunx expo start -c)${RESET}\n"
  fi
}

printf "\n${BOLD}${CYAN}BankStats${RESET} ${BOLD}· %s${RESET}\n" "$platform"
printf "${DIM}────────────────────────${RESET}\n\n"

case "$platform" in
  ios)
    ios_arguments=(--device)
    if [[ -n "$device" ]]; then
      ios_arguments+=("$device")
      printf "${YELLOW}▸${RESET} Building and launching on ${BOLD}%s${RESET} ${DIM}(this can take a while on first run)${RESET}\n\n" "$device"
    else
      printf "${YELLOW}▸${RESET} Select an iPhone or simulator in the Expo device picker\n"
      printf "${DIM}Connect and unlock a physical iPhone before continuing${RESET}\n\n"
    fi
    # Expo's precompiled-modules path (prebuilt XCFrameworks + a VFS overlay,
    # the default since SDK 57) confuses the New Build System's implicit
    # dependency graph across the BankStats.xcodeproj/Pods.xcodeproj split:
    # the app target's Swift compile starts before any CocoaPods pod target
    # has finished, so every Expo*/EX* module map is reported missing and the
    # build fails with "no such module 'Expo'" in AppDelegate.swift — 100%
    # reproducible, not flaky. Forcing pods to build from source sidesteps it.
    EXPO_USE_PRECOMPILED_MODULES=0 bunx expo run:ios "${ios_arguments[@]}"
    ;;
  android)
    setup_dev_host && export REACT_NATIVE_PACKAGER_HOSTNAME="$DEV_HOST"
    warn_on_missing_convex_url
    printf "${YELLOW}▸${RESET} Building and launching on Android ${DIM}(this can take a while on first run)${RESET}\n\n"
    bunx expo run:android --device
    ;;
  web)
    printf "${DIM}  Native modules (notification capture, the local outbox) don't exist on web — expect a reduced app${RESET}\n\n"
    printf "${YELLOW}▸${RESET} Starting the web bundler\n\n"
    bunx expo start --web
    ;;
  start)
    setup_dev_host && export REACT_NATIVE_PACKAGER_HOSTNAME="$DEV_HOST"
    warn_on_missing_convex_url
    printf "${YELLOW}▸${RESET} Starting the bundler ${DIM}(dev build must already be installed on the device)${RESET}\n\n"
    bunx expo start
    ;;
esac

printf "\n${GREEN}${BOLD}✓ Done${RESET}\n"
