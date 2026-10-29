#!/usr/bin/env sh
set -eu

PACKAGE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BUILD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/bankstats-notification-inbox.XXXXXX")"
trap 'rm -rf "$BUILD_DIR"' EXIT

if [ "$(uname -s)" = Darwin ]; then
  SQLCIPHER_PREFIX="$(brew --prefix sqlcipher)"
  SQLCIPHER_INCLUDE="$SQLCIPHER_PREFIX/include/sqlcipher"
  SQLCIPHER_LIB="$SQLCIPHER_PREFIX/lib"
else
  SQLCIPHER_INCLUDE="$(pkg-config --variable=includedir sqlcipher)"
  SQLCIPHER_LIB="$(pkg-config --variable=libdir sqlcipher)"
  if [ -f "$SQLCIPHER_INCLUDE/sqlcipher/sqlite3.h" ]; then
    SQLCIPHER_INCLUDE="$SQLCIPHER_INCLUDE/sqlcipher"
  fi
fi

cat > "$BUILD_DIR/module.modulemap" <<MODULE
module SQLCipher [system] {
  header "$SQLCIPHER_INCLUDE/sqlite3.h"
  link "sqlcipher"
  export *
}
MODULE

swiftc -O -I "$BUILD_DIR" -L "$SQLCIPHER_LIB" -Xcc -DSQLITE_HAS_CODEC \
  -o "$BUILD_DIR/inbox" \
  "$PACKAGE_DIR/ios/NotificationAdmission.swift" \
  "$PACKAGE_DIR/ios/NotificationAmount.swift" \
  "$PACKAGE_DIR/ios/NormalizedRecord.swift" \
  "$PACKAGE_DIR/ios/BankNotificationRules.swift" \
  "$PACKAGE_DIR/ios/BankNotificationInterpreter.swift" \
  "$PACKAGE_DIR/ios/NotificationInbox.swift" \
  "$PACKAGE_DIR/ios/NotificationBankStore.swift" \
  "$PACKAGE_DIR/ios/CardPaymentPairing.swift" \
  "$PACKAGE_DIR/ios/SyntheticSample.swift" \
  "$PACKAGE_DIR/ios/EncryptedOutbox.swift" \
  "$PACKAGE_DIR/ios/IngestionAttemptLog.swift" \
  "$PACKAGE_DIR/ios/NotificationCapture.swift" \
  "$PACKAGE_DIR/conformance/notification-inbox/main.swift"

LD_LIBRARY_PATH="$SQLCIPHER_LIB${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" \
  "$BUILD_DIR/inbox" "$PACKAGE_DIR/../parser-rules/rules/bank-notification-rules.json" \
  "$PACKAGE_DIR/../parser-rules/examples/bank-notification-examples.json" "$BUILD_DIR"
