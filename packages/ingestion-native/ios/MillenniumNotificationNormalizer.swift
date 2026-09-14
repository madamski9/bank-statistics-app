import Foundation

struct MillenniumNotificationNormalizer {
  private let expression = try! NSRegularExpression(
    pattern: #"(?i)^płatność kartą:?\s*([0-9]+(?:[,.][0-9]{1,2})?)\s*([A-Z]{3})\s+(?:w|u)\s+(.+?)\.?$"#
  )

  func normalize(_ rawText: String, sourceApp: String, capturedAt: Date = Date()) throws -> NormalizedRecord {
    let range = NSRange(rawText.startIndex..<rawText.endIndex, in: rawText)

    guard let match = expression.firstMatch(in: rawText, range: range),
      let amountRange = Range(match.range(at: 1), in: rawText),
      let currencyRange = Range(match.range(at: 2), in: rawText),
      let merchantRange = Range(match.range(at: 3), in: rawText),
      let amountMinor = minorUnits(String(rawText[amountRange])) else {
      throw IngestionError.unsupportedNotification
    }

    let timestamp = ISO8601DateFormatter().string(from: capturedAt)

    return NormalizedRecord(
      id: UUID().uuidString.lowercased(),
      bank: "millennium",
      direction: "expense",
      amountMinor: amountMinor,
      currency: String(rawText[currencyRange]).uppercased(),
      merchant: String(rawText[merchantRange]).trimmingCharacters(in: .whitespacesAndNewlines),
      occurredAt: timestamp,
      capturedAt: timestamp,
      sourceApp: sourceApp,
      status: "pending"
    )
  }

  private func minorUnits(_ value: String) -> Int? {
    let parts = value.replacingOccurrences(of: ",", with: ".").split(separator: ".")

    guard !parts.isEmpty, parts.count <= 2, let whole = Int(parts[0]) else {
      return nil
    }

    let fraction = parts.count == 2 ? String(parts[1]) : ""
    let paddedFraction = fraction.padding(toLength: 2, withPad: "0", startingAt: 0)

    guard paddedFraction.count == 2, let minor = Int(paddedFraction) else {
      return nil
    }

    return whole * 100 + minor
  }
}
