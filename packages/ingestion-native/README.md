# @bankstats/ingestion-native

The Expo native module that owns transaction ingestion outside the React Native runtime. Its one
iOS App Intent, `Capture Millennium Notification`, is fed by a single Shortcuts automation that
triggers on a notification from **either** Millennium **or** Portfel (Wallet) and normalizes
whichever text arrives:

- A Millennium transfer push (incoming/outgoing) is saved as before.
- Millennium's own card-payment push (e.g. "Płatność kartą debetową: Kwota: ...") never names the
  merchant, so it is recognized and deliberately dropped — not saved, not treated as an error —
  rather than stored twice once Wallet's own push for the same purchase arrives.
- Wallet's push for a Millennium card (e.g. "Bank Millennium S.A. / Inmedio Gdańsk, Pomorskie /
  7,49 zł") is what actually supplies the merchant name, and is saved as the `cardPayment` record.

Records persist in an App Group SQLCipher outbox. The JavaScript API exposes synthetic ingestion
for both notification shapes, stored records, and storage diagnostics to the mobile application.

See [ADR 0004](../../docs/adr/0004-use-expo-with-native-platform-modules.md),
[ADR 0015](../../docs/adr/0015-use-a-shared-encrypted-local-outbox.md), and the
[iOS 27 notification automation spike](../../docs/spikes/ios-27-notification-automation.md).
