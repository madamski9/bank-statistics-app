import Foundation

struct NormalizedRecord: Codable, Sendable {
  let id: String
  let bank: String
  let direction: String
  let amountMinor: Int
  let currency: String
  let merchant: String
  let occurredAt: String
  let capturedAt: String
  let sourceApp: String
  let status: String

  var dictionary: [String: Any] {
    [
      "id": id,
      "bank": bank,
      "direction": direction,
      "amountMinor": amountMinor,
      "currency": currency,
      "merchant": merchant,
      "occurredAt": occurredAt,
      "capturedAt": capturedAt,
      "sourceApp": sourceApp,
      "status": status,
    ]
  }
}
