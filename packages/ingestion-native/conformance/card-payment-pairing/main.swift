import Foundation

func card(
  _ id: String,
  from sourceApp: String,
  at capturedAt: String,
  amountMinor: Int = 2670,
  currency: String = "PLN",
  bank: String = "mbank",
  merchant: String? = "AUTOPAY MOBILITY WARSZAWA",
  origin: String = NormalizedRecordOrigin.capture,
  occurredAt: String? = nil
) -> NormalizedRecord {
  NormalizedRecord(
    id: id,
    bank: bank,
    direction: "expense",
    transactionType: "cardPayment",
    amountMinor: amountMinor,
    currency: currency,
    merchant: merchant,
    accountName: nil,
    occurredAt: occurredAt ?? capturedAt,
    capturedAt: capturedAt,
    sourceApp: sourceApp,
    status: "pending",
    origin: origin
  )
}

let wallet = CardPaymentPairing.walletSourceApp
let bankApp = "pl.mbank"

func walletCard(_ id: String, at capturedAt: String, amountMinor: Int = 2670, currency: String = "PLN") -> NormalizedRecord {
  card(id, from: wallet, at: capturedAt, amountMinor: amountMinor, currency: currency, merchant: "Autopay Mobility")
}

func merged(_ record: NormalizedRecord, merchant: String) -> NormalizedRecord {
  var copy = record
  copy.merchant = merchant
  return copy
}

struct Case {
  let name: String
  let record: NormalizedRecord
  let existing: [NormalizedRecord]
  let paired: Set<String>
  let expected: CardPaymentResolution

  init(
    _ name: String,
    record: NormalizedRecord,
    existing: [NormalizedRecord],
    paired: Set<String> = [],
    expected: CardPaymentResolution
  ) {
    self.name = name
    self.record = record
    self.existing = existing
    self.paired = paired
    self.expected = expected
  }
}

let bankPush = card("bank", from: bankApp, at: "2026-10-16T14:21:00Z")
let walletPush = walletCard("wallet", at: "2026-10-16T14:20:30Z")
let millenniumApp = "pl.millenniumbank.bankmillennium"
let millenniumDebitPush = card(
  "millenniumDebit", from: millenniumApp, at: "2026-10-28T12:28:30Z", amountMinor: 150099, bank: "millennium", merchant: nil
)
let millenniumWalletPush = card(
  "millenniumWallet", from: millenniumApp, at: "2026-10-28T12:28:10Z", amountMinor: 150099, bank: "millennium", merchant: "Lidl"
)

let lateMillenniumDebitPush = card(
  "lateMillenniumDebit", from: millenniumApp, at: "2026-11-04T10:46:01Z", amountMinor: 425, bank: "millennium",
  merchant: nil, occurredAt: "2026-11-04T10:23:00Z"
)
let zabkaWalletPush = card(
  "zabkaWallet", from: millenniumApp, at: "2026-11-04T10:23:25Z", amountMinor: 425, bank: "millennium", merchant: "Żabka"
)
let lateLidlDebitPush = card(
  "lateLidlDebit", from: millenniumApp, at: "2026-11-04T13:36:11Z", amountMinor: 1137, bank: "millennium",
  merchant: nil, occurredAt: "2026-11-04T13:12:00Z"
)
let firstPubDebitPush = card(
  "firstPubDebit", from: millenniumApp, at: "2026-11-09T19:48:20Z", amountMinor: 4200, bank: "millennium",
  merchant: nil, occurredAt: "2026-11-09T19:48:00Z"
)
let secondPubDebitPush = card(
  "secondPubDebit", from: millenniumApp, at: "2026-11-09T20:51:15Z", amountMinor: 4200, bank: "millennium",
  merchant: nil, occurredAt: "2026-11-09T20:51:00Z"
)
let boltDebitPush = card(
  "boltDebit", from: millenniumApp, at: "2026-11-09T22:10:30Z", amountMinor: 1890, bank: "millennium",
  merchant: nil, occurredAt: "2026-11-09T22:10:00Z"
)

func declined(_ record: NormalizedRecord) -> NormalizedRecord {
  var copy = record
  copy.walletPairing = CardPaymentPairing.declinedWalletPairing
  return copy
}

let cases = [
  Case(
    "mBank push after the Wallet push keeps the Wallet record",
    record: bankPush,
    existing: [walletPush],
    expected: .keepExisting(id: "wallet")
  ),
  Case(
    "Wallet push after the mBank push names the merchant on the existing record",
    record: walletCard("wallet", at: "2026-10-16T14:21:40Z"),
    existing: [bankPush],
    expected: .replace(merged(bankPush, merchant: "Autopay Mobility"))
  ),
  Case("mBank push alone is saved", record: bankPush, existing: [], expected: .insert),
  Case("Wallet push alone is saved", record: walletPush, existing: [], expected: .insert),
  Case(
    "the same amount outside the window is a separate payment",
    record: bankPush,
    existing: [walletCard("wallet", at: "2026-10-16T14:10:59Z")],
    expected: .insert
  ),
  Case(
    "the window edge still pairs",
    record: bankPush,
    existing: [walletCard("wallet", at: "2026-10-16T14:11:00Z")],
    expected: .keepExisting(id: "wallet")
  ),
  Case(
    "a different amount inside the window is a separate payment",
    record: bankPush,
    existing: [walletCard("wallet", at: "2026-10-16T14:20:30Z", amountMinor: 2671)],
    expected: .insert
  ),
  Case(
    "a different currency inside the window is a separate payment",
    record: bankPush,
    existing: [walletCard("wallet", at: "2026-10-16T14:20:30Z", currency: "EUR")],
    expected: .insert
  ),
  Case(
    "two mBank pushes for the same amount are two payments",
    record: bankPush,
    existing: [card("earlier", from: bankApp, at: "2026-10-16T14:20:00Z")],
    expected: .insert
  ),
  Case(
    "two Wallet pushes for the same amount are two payments",
    record: walletPush,
    existing: [walletCard("earlier", at: "2026-10-16T14:20:00Z")],
    expected: .insert
  ),
  Case(
    "a Wallet record already paired is not paired again",
    record: bankPush,
    existing: [walletPush],
    paired: ["wallet"],
    expected: .insert
  ),
  Case(
    "the closest unpaired counterpart is chosen",
    record: bankPush,
    existing: [walletCard("far", at: "2026-10-16T14:14:00Z"), walletCard("near", at: "2026-10-16T14:20:50Z")],
    expected: .keepExisting(id: "near")
  ),
  Case(
    "another bank's Wallet payment is not paired",
    record: bankPush,
    existing: [card("ing", from: wallet, at: "2026-10-16T14:20:30Z", bank: "ing")],
    expected: .insert
  ),
  Case(
    "Millennium debit push after the Wallet push keeps the Wallet record",
    record: millenniumDebitPush,
    existing: [millenniumWalletPush],
    expected: .keepExisting(id: "millenniumWallet")
  ),
  Case(
    "Wallet push after the Millennium debit push names the merchant on the existing record",
    record: millenniumWalletPush,
    existing: [millenniumDebitPush],
    expected: .replace(merged(millenniumDebitPush, merchant: "Lidl"))
  ),
  Case(
    "a Millennium debit push captured late pairs by the operation time it carries",
    record: lateMillenniumDebitPush,
    existing: [zabkaWalletPush],
    expected: .keepExisting(id: "zabkaWallet")
  ),
  Case(
    "a Wallet push pairs with a Millennium debit push captured late",
    record: card(
      "lidlWallet", from: millenniumApp, at: "2026-11-04T13:13:27Z", amountMinor: 1137, bank: "millennium",
      merchant: "Lidl"
    ),
    existing: [lateLidlDebitPush],
    expected: .replace(merged(lateLidlDebitPush, merchant: "Lidl"))
  ),
  Case(
    "a Millennium debit push for an operation more than three hours after the Wallet payment is a separate payment",
    record: card(
      "laterDebit", from: millenniumApp, at: "2026-11-04T13:30:01Z", amountMinor: 425, bank: "millennium",
      merchant: nil, occurredAt: "2026-11-04T13:24:00Z"
    ),
    existing: [zabkaWalletPush],
    expected: .insert
  ),
  Case(
    "a Wallet push thirteen minutes after a Millennium pre-authorisation names the merchant",
    record: card(
      "pubWallet", from: millenniumApp, at: "2026-11-09T20:01:12Z", amountMinor: 4200, bank: "millennium",
      merchant: "Pub Red Light"
    ),
    existing: [firstPubDebitPush],
    expected: .replace(merged(firstPubDebitPush, merchant: "Pub Red Light"))
  ),
  Case(
    "a Wallet push half an hour after a Millennium pre-authorisation names the merchant",
    record: card(
      "boltWallet", from: millenniumApp, at: "2026-11-09T22:40:05Z", amountMinor: 1890, bank: "millennium",
      merchant: "Bolt"
    ),
    existing: [boltDebitPush],
    expected: .replace(merged(boltDebitPush, merchant: "Bolt"))
  ),
  Case(
    "a second Wallet payment of the same amount pairs with the unpaired Millennium push",
    record: card(
      "secondPubWallet", from: millenniumApp, at: "2026-11-09T21:20:40Z", amountMinor: 4200, bank: "millennium",
      merchant: "Pub Red Light"
    ),
    existing: [merged(firstPubDebitPush, merchant: "Pub Red Light"), secondPubDebitPush],
    paired: ["firstPubDebit"],
    expected: .replace(merged(secondPubDebitPush, merchant: "Pub Red Light"))
  ),
  Case(
    "a Millennium push the user stopped waiting on is never paired",
    record: card(
      "boltWallet", from: millenniumApp, at: "2026-11-09T22:40:05Z", amountMinor: 1890, bank: "millennium",
      merchant: "Bolt"
    ),
    existing: [declined(boltDebitPush)],
    expected: .insert
  ),
  Case(
    "a Wallet push more than three hours after a Millennium push is a separate payment",
    record: card(
      "lateWallet", from: millenniumApp, at: "2026-11-10T01:10:31Z", amountMinor: 1890, bank: "millennium",
      merchant: "Bolt"
    ),
    existing: [boltDebitPush],
    expected: .insert
  ),
  Case(
    "the three hour window applies only to Millennium",
    record: bankPush,
    existing: [walletCard("wallet", at: "2026-10-16T14:00:00Z")],
    expected: .insert
  ),
  Case(
    "Millennium debit push without a Wallet push is saved",
    record: millenniumDebitPush,
    existing: [],
    expected: .insert
  ),
  Case(
    "two Millennium debit pushes for the same amount are two payments",
    record: millenniumDebitPush,
    existing: [card("earlier", from: millenniumApp, at: "2026-10-28T12:27:00Z", amountMinor: 150099, bank: "millennium", merchant: nil)],
    expected: .insert
  ),
  Case(
    "a manual transaction is never paired",
    record: bankPush,
    existing: [card("manual", from: wallet, at: "2026-10-16T14:20:30Z", origin: NormalizedRecordOrigin.manual)],
    expected: .insert
  ),
]

var failures = 0

for testCase in cases {
  let actual = CardPaymentPairing(paired: testCase.paired).resolve(testCase.record, existing: testCase.existing)

  if actual != testCase.expected {
    failures += 1
    print("FAIL \(testCase.name)\n  expected: \(testCase.expected)\n  actual:   \(actual)")
  }
}

print("\(cases.count - failures)/\(cases.count) pairing cases pass")
exit(failures == 0 ? 0 : 1)
