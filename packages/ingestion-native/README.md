# @bankstats/ingestion-native

The Expo native module that owns notification ingestion outside the React Native runtime. Its iOS
App Intent normalizes supported Millennium notifications and persists normalized records in an App
Group SQLCipher outbox. The JavaScript API exposes synthetic ingestion, stored records, and storage
diagnostics to the mobile application.

See [ADR 0004](../../docs/adr/0004-use-expo-with-native-platform-modules.md),
[ADR 0015](../../docs/adr/0015-use-a-shared-encrypted-local-outbox.md), and the
[iOS 27 notification automation spike](../../docs/spikes/ios-27-notification-automation.md).
