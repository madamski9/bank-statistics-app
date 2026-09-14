import Foundation

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
    ]

    value["transactionType"] = transactionType
    value["merchant"] = merchant
    value["accountName"] = accountName

    return value
  }
}
