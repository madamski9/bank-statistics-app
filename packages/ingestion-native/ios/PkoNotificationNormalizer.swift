import Foundation

struct PkoNotificationNormalizer {
  static let sourceApp = "pl.pkobp.iko"

  private let transferExpression = try! NSRegularExpression(
    pattern: #"(?i)^(otrzymano|wysłano|wykonano|zlecono)\s+przelew\b(.*?)\s*data:\s*([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}(?::[0-9]{2})?)\s*kwota:\s*[-−+]?\s*("# + NotificationAmount.groupedPattern + #")\s*([A-Z]{3})\.?$"#
  )

  func record(body: String, capturedAt: Date) -> NormalizedRecord? {
    let range = NSRange(body.startIndex..<body.endIndex, in: body)

    guard let match = transferExpression.firstMatch(in: body, range: range),
      let verbRange = Range(match.range(at: 1), in: body),
      let dateRange = Range(match.range(at: 3), in: body),
      let amountRange = Range(match.range(at: 4), in: body),
      let currencyRange = Range(match.range(at: 5), in: body),
      let amountMinor = NotificationAmount.minorUnits(String(body[amountRange])),
      amountMinor > 0,
      let occurredAt = transferDate(String(body[dateRange])) else {
      return nil
    }

    let isIncoming = body[verbRange].lowercased() == "otrzymano"

    return NormalizedRecord(
      id: UUID().uuidString.lowercased(),
      bank: "pko",
      direction: isIncoming ? "income" : "expense",
      transactionType: isIncoming ? "incomingTransfer" : "outgoingTransfer",
      amountMinor: amountMinor,
      currency: String(body[currencyRange]).uppercased(),
      merchant: nil,
      accountName: nil,
      occurredAt: ISO8601DateFormatter().string(from: occurredAt),
      capturedAt: ISO8601DateFormatter().string(from: capturedAt),
      sourceApp: Self.sourceApp,
      status: "pending"
    )
  }

  private func transferDate(_ value: String) -> Date? {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.timeZone = TimeZone(identifier: "Europe/Warsaw")
    formatter.dateFormat = value.count > 16 ? "yyyy-MM-dd HH:mm:ss" : "yyyy-MM-dd HH:mm"
    return formatter.date(from: value)
  }
}
