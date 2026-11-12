# @bankstats/ingestion-native

The Expo native module that owns transaction ingestion outside the React Native runtime. Its one
iOS App Intent, `Capture Bank Notification` (`IngestMillenniumNotificationIntent`), is fed by a single Shortcuts automation that
triggers on a notification from the selected banks or Portfel (Wallet). On iOS, a lightweight
admission filter first looks for an amount with an ISO currency code or supported currency symbol.
It accepts symbols before or after the amount, decimal commas or points, and grouped thousands.
Wallet-shaped notifications with a merchant subtitle and a bare amount retain their existing
currency-review path. Explicit promotional calls to action are rejected even if they contain money;
merchant subtitles are not scanned for promotional language. This is a heuristic, not a guarantee
that every advertisement can be identified.

Admitted notifications are committed to the encrypted `notification_inbox` table before loading
or running the transaction parser. Recognition and removal of raw text are committed atomically
with the normalized record and card-payment pairing. A failed operation rolls back, retaining the
original payload and capture time. Each inbox entry supplies a stable transaction identifier.
Unrecognized formats are retained on this phone for at most 30 days and retried after the bundled
rule version changes. Interrupted processing and storage failures remain eligible on the next
record read. Record reads process up to 50 eligible entries at a time. Expiry runs whenever the
database is opened; if the app is not running, cleanup happens on its next database access.
Raw payloads are never exposed through the synchronization API. Capture health shows the pending
count, and clearing local data clears the inbox. When the Shortcut queues a notification, the App
Intent posts a local alert in the app language, without the original text; tapping it opens the
inbox. Repeated alerts replace one another, and none appears without notification permission. The admission and SQLCipher lifecycle checks run
with `sh conformance/notification-inbox/run.sh` (Swift and SQLCipher development files required).

After durable enqueue, the existing bank rules still decide whether a transaction can be created:

- A Millennium transfer push (incoming/outgoing) is saved as before.
- A push without a monetary amount, such as a request to rate the app, and recognized promotional
  messages are ignored with `notTransaction`. Unknown monetary formats remain pending, never
  affecting statistics until a rule can recognize them.
- Millennium's own debit card push (`Płatność kartą debetową: Kwota: -1 500,99 PLN, Karta:…,
  Data: 28/10/2026 13:28`) never names the merchant but is saved as a `millennium` card payment
  dated from its `Data`, because card-on-file, online and physical-card payments produce no Wallet
  push. An Apple Pay purchase produces both pushes, and they are paired like mBank's: a Wallet push
  arriving later names the merchant on the saved record, and a debit push arriving after the Wallet
  record is dropped. Millennium records saved from Wallet keep the Millennium source app, so any
  Millennium card payment with a merchant counts as the Wallet side of a pair. Other Millennium
  pushes mentioning a payment, such as a declined card payment, stay in the encrypted inbox with
  `cardPaymentAwaitingApplePay` and do not raise the unknown-format warning.
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
bank, for the same amount and currency, captured at most an hour apart, are one purchase. A push
that states its operation time, like Millennium's debit card push, also pairs when that time is at most
an hour from the other record's. The window is the same for every bank, because Shortcuts can run a
bank's automation long after the purchase and Millennium pushes a pre-authorisation, such as Bolt's or a
pub tab's, up to half an hour before Wallet reports the payment. The closest unpaired counterpart wins,
and a bank push the user stopped waiting on, marked with `walletPairing` `declined`, is never paired. A
bank push arriving after the Wallet record is dropped with the reason `cardPaymentAlreadySaved`; a
Wallet push arriving after the bank record keeps that record and its identifier, gives it Wallet's
merchant name, so the shop is named the same way as other Wallet payments, and marks it `walletPairing`
`paired`. Until it is paired, declined or an hour past its capture or stated operation time, a bank card payment
shows the Awaiting Wallet badge. The same bank card push captured again within 30 seconds, with the same bank, source app,
amount, currency, merchant and stated operation time, is dropped as `cardPaymentAlreadySaved`, even when its first copy was
already paired or dropped. Each record can be paired once, which keeps two identical purchases made
minutes apart as two transactions. The pairing is checked by `sh conformance/card-payment-pairing/run.sh`.

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

The Capture settings open an iOS-only unrecognized-notifications inbox. Its paginated native API
returns full local notification fields and a diagnostic JSON snapshot with parser version, each
attempted rule, extracted groups, validation failures, and any normalized record whose storage
failed. Snapshots share the raw entry's encryption and expiry. Existing inbox databases migrate
without discarding queued notifications. `retryNotification` forces recognition with current rules;
`restoreNotification` saves a user-confirmed manual transaction with the original inbox identifier
and capture timestamp and deletes the raw entry in one transaction. Storage failures roll back
both operations, and a stale second restore cannot insert another transaction.

Reporting a problem is a separate, explicit action. The app prepares an editable sample by masking
recognized names and common email, phone and account identifiers. This is partial redaction: users
must inspect all fields and remove remaining personal details, actual amounts and dates before
confirming. Editing any field clears confirmation. Both preview and server compute the sample's
JSON from the edited sample, never from the original trace. Convex stores only the confirmed sample
in `diagnosticSamples`, with authenticated ownership, idempotent submission identifiers, a limit of
ten samples per rolling 24 hours, and 90-day expiry. Expired samples are purged daily and account
deletion also removes them. Reports can be inspected by developers in the Convex dashboard; there
is no public listing endpoint. They do not create transactions or enable transaction synchronization.

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
