# @bankstats/parser-rules

The single versioned set of bank notification rules and conformance examples, shared by the native
interpreters. See [ADR 0005](../../docs/adr/0005-share-parser-rules-across-native-interpreters.md).

Notification ingestion has to work while the React Native runtime is unavailable, so the rules are
data rather than JavaScript:

- [`rules/bank-notification-rules.json`](rules/bank-notification-rules.json) is the rule bundle.
  Rules are tried in order; the first whose requirements and pattern match either ignores the
  notification with a reason code or builds a record from named capture groups. A rule whose record
  cannot be built (a zero amount, an impossible date) falls through to the next one, and nothing
  matching ends as `notTransaction`.
- [`examples/bank-notification-examples.json`](examples/bank-notification-examples.json) holds
  sanitized notifications with the exact outcome every interpreter must produce.
- [`src/bank-notification-interpreter.ts`](src/bank-notification-interpreter.ts) is the reference
  interpreter, run against the examples by `bun test`.
- The Swift interpreter lives in `packages/ingestion-native/ios` and is checked against the same
  examples by `sh conformance/swift/run.sh` (a CI job on macOS).
- The Kotlin interpreter lives in `packages/ingestion-native/android` and is checked against the same
  examples by its instrumented tests on an Android emulator or device.

Patterns are written in the subset shared by ICU and JavaScript `u`-mode regular expressions: named
groups, no inline flags (`caseInsensitive` replaces `(?i)`), and `{{fragment}}` placeholders for
shared pieces such as the amount pattern. Dates are parsed with explicit formats in an explicit
time zone and rejected when they do not exist.

The iOS config plugin copies the bundle into the `BankStatsParserRules` resource bundle during
prebuild. Signed remote delivery and rollback ([ADR 0007](../../docs/adr/0007-deliver-signed-parser-rules.md))
are not built yet; the bundled rules are the only ones in use.

## Changing a rule

1. Add sanitized examples for the new or changed notification shape.
2. Update the rule bundle and increase `version`.
3. Run `bun test packages/parser-rules`, `sh packages/parser-rules/conformance/swift/run.sh` and, from
   `mobile/android`, `./gradlew :bankstats-ingestion-native:connectedDebugAndroidTest`.
