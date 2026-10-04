#!/usr/bin/env sh
set -eu

PACKAGE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
NATIVE_DIR="$PACKAGE_DIR/../ingestion-native/ios"
BUILD_DIR="${TMPDIR:-/tmp}/bankstats-parser-conformance"

mkdir -p "$BUILD_DIR"
swiftc -O -o "$BUILD_DIR/conformance" \
  "$NATIVE_DIR/NotificationAmount.swift" \
  "$NATIVE_DIR/NormalizedRecord.swift" \
  "$NATIVE_DIR/BankNotificationRules.swift" \
  "$NATIVE_DIR/BankNotificationInterpreter.swift" \
  "$PACKAGE_DIR/conformance/swift/main.swift"

"$BUILD_DIR/conformance" \
  "$PACKAGE_DIR/rules/bank-notification-rules.json" \
  "$PACKAGE_DIR/examples/bank-notification-examples.json"
