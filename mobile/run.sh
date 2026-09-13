#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

cleanup() {
  kill $CONVEX_PID $EXPO_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

bunx convex dev &
CONVEX_PID=$!

bunx expo start --dev-client &
EXPO_PID=$!

wait $CONVEX_PID $EXPO_PID
