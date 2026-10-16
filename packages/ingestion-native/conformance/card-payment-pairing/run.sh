#!/usr/bin/env sh
set -eu

PACKAGE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BUILD_DIR="${TMPDIR:-/tmp}/bankstats-card-payment-pairing"

mkdir -p "$BUILD_DIR"
swiftc -O -o "$BUILD_DIR/pairing" \
  "$PACKAGE_DIR/ios/NormalizedRecord.swift" \
  "$PACKAGE_DIR/ios/CardPaymentPairing.swift" \
  "$PACKAGE_DIR/conformance/card-payment-pairing/main.swift"

"$BUILD_DIR/pairing"
