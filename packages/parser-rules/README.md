# @bankstats/parser-rules

The single versioned set of bank notification rules and conformance examples, shared by the Swift
and Kotlin interpreters. See [ADR 0005](../../docs/adr/0005-share-parser-rules-across-native-interpreters.md).

Notification ingestion has to work while the React Native runtime is unavailable, so the rules are
data rather than JavaScript: each native interpreter reads the same versioned rule set and the same
examples, and CI runs those examples against both interpreters.

This package is the boundary reserved by issue #1. The rule format, the signing and rollback
mechanism, and the first bank's rules are defined by issues #7 and #9 — nothing here invents that
schema ahead of them.
