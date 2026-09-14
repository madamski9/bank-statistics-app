#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONVEX_PID=""
EXPO_PID=""

cleanup() {
  if [[ -n "$CONVEX_PID" ]]; then
    kill "$CONVEX_PID" 2>/dev/null || true
  fi
  if [[ -n "$EXPO_PID" ]]; then
    kill "$EXPO_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

cd "$PROJECT_ROOT/mobile"

bunx convex dev &
CONVEX_PID=$!

bunx expo start --dev-client &
EXPO_PID=$!

wait "$CONVEX_PID" "$EXPO_PID"
