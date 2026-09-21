# @bankstats/ingestion-native

The Expo native module that owns transaction ingestion outside the React Native runtime. Its one
iOS App Intent, `Capture Millennium Notification`, is fed by a single Shortcuts automation that
triggers on a notification from **either** Millennium **or** Portfel (Wallet) and normalizes
whichever text arrives:

- A Millennium transfer push (incoming/outgoing) is saved as before.
- Millennium's own card-payment push (e.g. "Płatność kartą debetową: Kwota: ...") never names the
  merchant, so it is recognized and deliberately dropped — not saved, not treated as an error —
  rather than stored twice once Wallet's own push for the same purchase arrives.
- Wallet's push for a Millennium card is what actually supplies the merchant name, and is saved as
  the `cardPayment` record. It arrives as separate notification fields — subtitle
  `Lidl  Gdańsk, Pomorskie`, body `5,08 zł` — and the automation maps both to the intent's
  `Notification Subtitle` and `Notification Body`. A subtitle alongside a body that is nothing but
  an amount is what identifies a Wallet transaction; a bank push has no subtitle and a sentence in
  its body. Nothing keys off the currency, so a payment abroad is captured in the currency it was
  made in. The location suffix after the double space is stripped from the merchant when it ends in
  a voivodeship.

A Wallet push whose body carries an amount with no currency symbol is still captured, as a Review
Item flagged `currency`: the transaction reaches the timeline but stays out of statistics until the
user confirms the currency.

Records persist in an App Group SQLCipher outbox. The JavaScript API exposes synthetic ingestion
for both notification shapes, stored records, storage diagnostics, and writes — `saveIngestionRecord`
(insert or replace by identifier, used for manual transactions, corrections and review decisions)
and `deleteIngestionRecord` — to the mobile application.

See [ADR 0004](../../docs/adr/0004-use-expo-with-native-platform-modules.md),
[ADR 0015](../../docs/adr/0015-use-a-shared-encrypted-local-outbox.md), and the
[iOS 27 notification automation spike](../../docs/spikes/ios-27-notification-automation.md).
