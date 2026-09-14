import Foundation

struct MillenniumNotificationNormalizer {
  private let cardPaymentExpression = try! NSRegularExpression(
    pattern: #"(?i)^płatność kartą:?\s*([0-9]+(?:[,.][0-9]{1,2})?)\s*([A-Z]{3})\s+(?:w|u)\s+(.+?)\.?$"#
  )
  private let outgoingTransferExpression = try! NSRegularExpression(
    pattern: #"(?i)^przelew wychodzący:\s*kwota:\s*([0-9]+(?:[,.][0-9]{1,2})?)\s*([A-Z]{3}),\s*z rachunku:\s*(.+?),\s*data:\s*([0-9]{2}/[0-9]{2}/[0-9]{4} [0-9]{2}:[0-9]{2})$"#
  )
  private let incomingTransferExpression = try! NSRegularExpression(
    pattern: #"(?i)^przelew przychodzący:\s*kwota:\s*([0-9]+(?:[,.][0-9]{1,2})?)\s*([A-Z]{3}),\s*na rachunek:\s*(.+?),\s*data:\s*([0-9]{2}/[0-9]{2}/[0-9]{4} [0-9]{2}:[0-9]{2})$"#
  )

  func normalize(_ rawText: String, sourceApp: String, capturedAt: Date = Date()) throws -> NormalizedRecord {
    let text = rawText
      .replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
      .trimmingCharacters(in: .whitespacesAndNewlines)

    if let record = cardPayment(text, sourceApp: sourceApp, capturedAt: capturedAt) {
      return record
    }

    if let record = transfer(
      text,
      expression: outgoingTransferExpression,
      direction: "expense",
      transactionType: "outgoingTransfer",
      sourceApp: sourceApp,
      capturedAt: capturedAt
    ) {
      return record
    }

    if let record = transfer(
      text,
      expression: incomingTransferExpression,
      direction: "income",
      transactionType: "incomingTransfer",
      sourceApp: sourceApp,
      capturedAt: capturedAt
    ) {
      return record
    }

    throw IngestionError.unsupportedNotification
  }

  private func cardPayment(_ text: String, sourceApp: String, capturedAt: Date) -> NormalizedRecord? {
    let range = NSRange(text.startIndex..<text.endIndex, in: text)

    guard let match = cardPaymentExpression.firstMatch(in: text, range: range),
      let amountRange = Range(match.range(at: 1), in: text),
      let currencyRange = Range(match.range(at: 2), in: text),
      let merchantRange = Range(match.range(at: 3), in: text),
      let amountMinor = minorUnits(String(text[amountRange])) else {
      return nil
    }

    let timestamp = ISO8601DateFormatter().string(from: capturedAt)

    return NormalizedRecord(
      id: UUID().uuidString.lowercased(),
      bank: "millennium",
      direction: "expense",
      transactionType: "cardPayment",
      amountMinor: amountMinor,
      currency: String(text[currencyRange]).uppercased(),
      merchant: String(text[merchantRange]).trimmingCharacters(in: .whitespacesAndNewlines),
      accountName: nil,
      occurredAt: timestamp,
      capturedAt: timestamp,
      sourceApp: sourceApp,
      status: "pending"
    )
  }

  private func transfer(
    _ text: String,
    expression: NSRegularExpression,
    direction: String,
    transactionType: String,
    sourceApp: String,
    capturedAt: Date
  ) -> NormalizedRecord? {
    let range = NSRange(text.startIndex..<text.endIndex, in: text)

    guard let match = expression.firstMatch(in: text, range: range),
      let amountRange = Range(match.range(at: 1), in: text),
      let currencyRange = Range(match.range(at: 2), in: text),
      let accountRange = Range(match.range(at: 3), in: text),
      let dateRange = Range(match.range(at: 4), in: text),
      let amountMinor = minorUnits(String(text[amountRange])),
      let occurredAt = transferDate(String(text[dateRange])) else {
      return nil
    }

    return NormalizedRecord(
      id: UUID().uuidString.lowercased(),
      bank: "millennium",
      direction: direction,
      transactionType: transactionType,
      amountMinor: amountMinor,
      currency: String(text[currencyRange]).uppercased(),
      merchant: nil,
      accountName: String(text[accountRange]).trimmingCharacters(in: .whitespacesAndNewlines),
      occurredAt: ISO8601DateFormatter().string(from: occurredAt),
      capturedAt: ISO8601DateFormatter().string(from: capturedAt),
      sourceApp: sourceApp,
      status: "pending"
    )
  }

  private func transferDate(_ value: String) -> Date? {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.timeZone = TimeZone(identifier: "Europe/Warsaw")
    formatter.dateFormat = "dd/MM/yyyy HH:mm"
    return formatter.date(from: value)
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
