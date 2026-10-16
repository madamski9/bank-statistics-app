# @bankstats/ingestion-native

The Expo native module that owns transaction ingestion outside the React Native runtime. Its one
iOS App Intent, `Capture Bank Notification` (`IngestMillenniumNotificationIntent`), is fed by a single Shortcuts automation that
triggers on a notification from **either** Millennium **or** Portfel (Wallet) and normalizes
whichever text arrives:

- A Millennium transfer push (incoming/outgoing) is saved as before.
- Any other bank push, such as an advertisement or a request to rate the app, is read and ignored
  with the reason `notTransaction`: nothing is saved and Shortcuts does not report an error.
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

A PKO BP push from IKO has no subtitle and a multi-line body — `Otrzymano przelew na numer
telefonu`, `Data: 2026-09-28 13:14:57`, `Kwota: 30,00 PLN` — and is saved as a `pko` transfer:
`Otrzymano przelew…` is income, `Wysłano`/`Wykonano`/`Zlecono przelew…` is an expense. The same
action serves both banks; the shared shortcut decides which apps trigger it (IKO, Millennium,
Portfel). A Wallet push's title names the card's bank (`Bank Millennium S.A.`, `PKO BP`), so the
automation maps it to the optional `Notification Title`: a title containing `PKO` records the card
payment as `pko`, and a title containing `Millennium` records it as `millennium`. Titles naming
ING, mBank or Erste/Santander use their dedicated rules. Any other title, including a missing title,
records the payment as `unknown` (displayed as “Unknown bank”), without guessing a supported bank.

A push from Moje ING has no subtitle and reports a balance change — `2,00 PLN mniej na Twoim
koncie - KONTO Mobi 18-26 - płatność BLIK` — and is saved as an `ing` record on the named account:
`mniej` is an expense (a `blikPayment` when it ends with `płatność BLIK`, otherwise an
`outgoingTransfer`), any other word is an `incomingTransfer`. A Wallet push titled
`ING Bank Śląski S.A.` records the card payment as `ing`.

A push from mBank PL uses the title `Przelew z konta` with body `1,00 PLN do JAN .`
for an outgoing transfer, or `Nowy przelew` with body `5,00 PLN wpłynęło od KOWALSKI JAN`
for an incoming transfer. The automation must pass `Notification Title` and `Notification Body`,
with an empty subtitle. The sender or recipient is retained as the counterparty, and the capture
time is used as the occurrence time because these pushes contain no transaction timestamp.
A Wallet push whose title names mBank records the card payment as `mbank`, with
`com.apple.Passbook` as its source app. mBank also sends its own card push, `Nowa operacja kartą` with
body `26,70 PLN w AUTOPAY MOBILITY WARSZAWA`, which is saved as an `mbank` card payment. Card-on-file
and online payments produce only this push, but an Apple Pay purchase produces both, so the outbox
pairs them when it saves a card payment: a Wallet card payment and a bank card payment from the same
bank, for the same amount and currency, captured at most ten minutes apart, are one purchase. The
closest unpaired counterpart wins. A bank push arriving after the Wallet record is dropped with the
reason `cardPaymentAlreadySaved`; a Wallet push arriving after the bank record keeps that record and
its identifier and gives it Wallet's merchant name, so the shop is named the same way as other Wallet
payments. Each record can be paired once, which keeps two identical purchases made minutes apart as
two transactions. The pairing is checked by `sh conformance/card-payment-pairing/run.sh`.

A Wallet push whose body carries an amount with no currency symbol is still captured, as a Review
Item flagged `currency`: the transaction reaches the timeline but stays out of statistics until the
user confirms the currency.

Recognition is data-driven: the native `BankNotificationInterpreter` applies the shared rule bundle
from [`@bankstats/parser-rules`](../parser-rules/README.md), which the config plugin copies into the
`BankStatsParserRules` resource bundle at prebuild. The rules above are described there together
with the examples every interpreter must reproduce.

Records persist in an App Group SQLCipher outbox. The same database holds a `documents` table for
the application's other encrypted state (Financial Accounts, the synchronization ledger, Custom
Categories, Events), exposed as `readEncryptedDocument`, `writeEncryptedDocument` and
`deleteEncryptedDocument`. The JavaScript API exposes synthetic ingestion
for both notification shapes, stored records, storage diagnostics, and writes — `saveIngestionRecord`
(insert or replace by identifier, used for manual transactions, corrections and review decisions)
and `deleteIngestionRecord` — to the mobile application.

On Android the same API is implemented in Kotlin in [`android/`](android). Its
`BankNotificationInterpreter` applies the same rule bundle, which Gradle adds to the module's
assets straight from `@bankstats/parser-rules`. Records and documents live in a SQLCipher database
in the app's no-backup directory. The database key is 32 random bytes that never leave the device:
they are encrypted with an AES-GCM key that Android Keystore generates and never exports, and only
that encrypted form is written to disk. Notification capture, the widget and PDF statements are not
built on Android yet. `ingestSyntheticMillenniumNotification` and
`ingestSyntheticApplePayTransaction` run the same synthetic samples through the interpreter. The
instrumented tests in `android/src/androidTest` check the shared examples, persistence across
restarts and that nothing reaches the disk in plaintext. Run them from `mobile/android` with
`./gradlew :bankstats-ingestion-native:connectedDebugAndroidTest` while an emulator or device is
connected.

See [ADR 0004](../../docs/adr/0004-use-expo-with-native-platform-modules.md),
[ADR 0015](../../docs/adr/0015-use-a-shared-encrypted-local-outbox.md), and the
[iOS 27 notification automation spike](../../docs/spikes/ios-27-notification-automation.md).
