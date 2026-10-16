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

struct NormalizedRecord: Codable, Equatable, Sendable {
  let id: String
  let bank: String
  let direction: String
  let transactionType: String?
  let amountMinor: Int
  let currency: String
  var merchant: String?
  let accountName: String?
  let occurredAt: String
  let capturedAt: String
  let sourceApp: String
  let status: String
  var origin: String? = nil
  var review: String? = nil
  var category: String? = nil
  var accountId: String? = nil
  var eventId: String? = nil
  var reportingAmountMinor: Int? = nil
  var exchangeRate: String? = nil
  var exchangeRateDate: String? = nil
  var exchangeRateTable: String? = nil

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
    value["accountId"] = accountId
    value["eventId"] = eventId
    value["reportingAmountMinor"] = reportingAmountMinor
    value["exchangeRate"] = exchangeRate
    value["exchangeRateDate"] = exchangeRateDate
    value["exchangeRateTable"] = exchangeRateTable

    return value
  }
}

enum NormalizationOutcome {
  case record(NormalizedRecord)
  case ignored(reasonCode: String)
}

enum IgnoredReason {
  static let cardPaymentAwaitingApplePay = "cardPaymentAwaitingApplePay"
  static let cardPaymentAlreadySaved = "cardPaymentAlreadySaved"
  static let notTransaction = "notTransaction"
}
