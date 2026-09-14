# @bankstats/ingestion-native

The Swift and Kotlin modules that capture bank notifications, normalize them with
[`@bankstats/parser-rules`](../parser-rules), and write them to the shared encrypted outbox. See
[ADR 0004](../../docs/adr/0004-use-expo-with-native-platform-modules.md) and
[ADR 0015](../../docs/adr/0015-use-a-shared-encrypted-local-outbox.md).

These modules run without an active React Native runtime, which is why they live outside `mobile/`
and depend only on the shared rule set.

This package is the boundary reserved by issue #1. The iOS App Intent path is proven by issue #2 and
the Android notification listener by issue #4; the native sources land here as those ship.
