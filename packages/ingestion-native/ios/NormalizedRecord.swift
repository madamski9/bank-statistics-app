import Foundation

enum NormalizedRecordOrigin {
  static let capture = "capture"
  static let manual = "manual"
}

enum ReviewReason {
  static let amount = "amount"
  static let currency = "currency"
  static let direction = "direction"
  static let merchant = "merchant"
}

struct NormalizedRecord: Codable, Sendable {
  let id: String
  let bank: String
  let direction: String
  let transactionType: String?
  let amountMinor: Int
  let currency: String
  let merchant: String?
  let accountName: String?
  let occurredAt: String
  let capturedAt: String
  let sourceApp: String
  let status: String
  var origin: String? = nil
  var review: String? = nil
  var category: String? = nil

  var dictionary: [String: Any] {
    var value: [String: Any] = [
      "id": id,
      "bank": bank,
      "direction": direction,
      "amountMinor": amountMinor,
      "currency": currency,
      "occurredAt": occurredAt,
      "capturedAt": capturedAt,
      "sourceApp": sourceApp,
      "status": status,
      "origin": origin ?? "capture",
    ]

    value["transactionType"] = transactionType
    value["merchant"] = merchant
    value["accountName"] = accountName
    value["review"] = review
    value["category"] = category

    return value
  }
}

/// A bank notification can normalize to a record, or it can be recognized-but-intentionally-
/// dropped — Millennium's own card-payment push never carries a merchant name, so it is deferred
/// to the Apple Pay Wallet transaction (captured separately, with the merchant) rather than saved
/// as a second, poorer-detail record for the same purchase.
enum NormalizationOutcome {
  case record(NormalizedRecord)
  case ignored(reasonCode: String)
}
