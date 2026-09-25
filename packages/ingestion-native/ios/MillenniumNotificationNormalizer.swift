import Foundation

struct MillenniumNotificationNormalizer {
  private static let groupedAmountPattern = #"(?:[0-9]{1,3}(?:\s[0-9]{3})+|[0-9]+)(?:[,.][0-9]{1,2})?"#
  private let cardPaymentExpression = try! NSRegularExpression(
    pattern: #"(?i)^płatność kartą:?\s*("# + groupedAmountPattern + #")\s*([A-Z]{3})\s+(?:w|u)\s+(.+?)\.?$"#
  )
  private let outgoingTransferExpression = try! NSRegularExpression(
    pattern: #"(?i)^przelew wychodzący:\s*kwota:\s*("# + groupedAmountPattern + #")\s*([A-Z]{3}),\s*z rachunku:\s*(.+?),\s*data:\s*([0-9]{2}/[0-9]{2}/[0-9]{4} [0-9]{2}:[0-9]{2})$"#
  )
  private let incomingTransferExpression = try! NSRegularExpression(
    pattern: #"(?i)^przelew przychodzący:\s*kwota:\s*("# + groupedAmountPattern + #")\s*([A-Z]{3}),\s*na rachunek:\s*(.+?),\s*data:\s*([0-9]{2}/[0-9]{2}/[0-9]{4} [0-9]{2}:[0-9]{2})$"#
  )
  // Millennium's real card-payment push (e.g. "Płatność kartą debetową: Kwota: -21,00 PLN,
  // Karta:Mastercard 360 **** **** **** 6899, Data: ...") never names the merchant - only the
  // "Portfel" (Wallet) push for the same purchase does. Matching just the word "płatność" anywhere
  // lets this notification be recognized and deliberately dropped instead of saved twice or
  // rejected as unsupported.
  private let genericCardPaymentExpression = try! NSRegularExpression(pattern: #"(?i)płatność"#)
  private let standaloneAmountExpression = try! NSRegularExpression(
    pattern: #"(?i)^(?:(\p{Sc})\s*)?[-−]?\s*((?:[0-9]{1,3}(?:\s[0-9]{3})+|[0-9]+)(?:[,.][0-9]{1,2})?)\s*(zł|zl|\p{Sc}|[A-Z]{3})?$"#
  )
  private let merchantLocationExpression = try! NSRegularExpression(
    pattern: #"(?i)\s+[^,]+,\s*(?:dolnośląskie|kujawsko-pomorskie|lubelskie|lubuskie|łódzkie|małopolskie|mazowieckie|opolskie|podkarpackie|podlaskie|pomorskie|śląskie|świętokrzyskie|warmińsko-mazurskie|wielkopolskie|zachodniopomorskie)$"#
  )

  struct Amount {
    let minor: Int
    let currency: String
    let isCurrencyRecognized: Bool
  }

  func normalize(
    subtitle: String,
    body: String,
    sourceApp: String,
    capturedAt: Date = Date()
  ) throws -> NormalizationOutcome {
    let merchant = collapseWhitespace(subtitle)
    let text = collapseWhitespace(body)

    if !merchant.isEmpty, let amount = standaloneAmount(text) {
      return .record(
        walletTransaction(
          merchant: merchant,
          amount: amount,
          sourceApp: sourceApp,
          capturedAt: capturedAt
        )
      )
    }

    if let record = cardPayment(text, sourceApp: sourceApp, capturedAt: capturedAt) {
      return .record(record)
    }

    if isGenericCardPayment(text) {
      return .ignored(reasonCode: IgnoredReason.cardPaymentAwaitingApplePay)
    }

    if let record = transfer(
      text,
      expression: outgoingTransferExpression,
      direction: "expense",
      transactionType: "outgoingTransfer",
      sourceApp: sourceApp,
      capturedAt: capturedAt
    ) {
      return .record(record)
    }

    if let record = transfer(
      text,
      expression: incomingTransferExpression,
      direction: "income",
      transactionType: "incomingTransfer",
      sourceApp: sourceApp,
      capturedAt: capturedAt
    ) {
      return .record(record)
    }

    return .ignored(reasonCode: IgnoredReason.notTransaction)
  }

  private func collapseWhitespace(_ value: String) -> String {
    value
      .replacingOccurrences(of: #"[^\S ]+"#, with: " ", options: .regularExpression)
      .replacingOccurrences(of: #" {2,}"#, with: "  ", options: .regularExpression)
      .trimmingCharacters(in: .whitespacesAndNewlines)
  }

  private func standaloneAmount(_ text: String) -> Amount? {
    let range = NSRange(text.startIndex..<text.endIndex, in: text)

    guard let match = standaloneAmountExpression.firstMatch(in: text, range: range),
      let digitsRange = Range(match.range(at: 2), in: text),
      let minor = minorUnits(String(text[digitsRange])) else {
      return nil
    }

    let prefix = Range(match.range(at: 1), in: text).map { String(text[$0]) }
    let suffix = Range(match.range(at: 3), in: text).map { String(text[$0]) }
    let code = (suffix ?? prefix).flatMap(currencyCode)

    return Amount(
      minor: minor,
      currency: code ?? "PLN",
      isCurrencyRecognized: code != nil
    )
  }

  private func currencyCode(_ symbol: String) -> String? {
    switch symbol.lowercased() {
    case "zł", "zl": return "PLN"
    case "€": return "EUR"
    case "$": return "USD"
    case "£": return "GBP"
    case "¥": return "JPY"
    case "₣": return "CHF"
    default:
      let code = symbol.uppercased()
      return code.range(of: "^[A-Z]{3}$", options: .regularExpression) != nil ? code : nil
    }
  }

  private func merchantName(_ value: String) -> String {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)

    if let separator = trimmed.range(of: "  ") {
      let name = String(trimmed[trimmed.startIndex..<separator.lowerBound])
        .trimmingCharacters(in: .whitespacesAndNewlines)

      if !name.isEmpty, isLocationSuffix(String(trimmed[separator.lowerBound...])) {
        return name
      }
    }

    let range = NSRange(trimmed.startIndex..<trimmed.endIndex, in: trimmed)

    guard let match = merchantLocationExpression.firstMatch(in: trimmed, range: range),
      let suffix = Range(match.range, in: trimmed),
      suffix.lowerBound != trimmed.startIndex else {
      return trimmed
    }

    return String(trimmed[trimmed.startIndex..<suffix.lowerBound])
      .trimmingCharacters(in: .whitespacesAndNewlines)
  }

  private func isLocationSuffix(_ text: String) -> Bool {
    let range = NSRange(text.startIndex..<text.endIndex, in: text)
    return merchantLocationExpression.firstMatch(in: text, range: range) != nil
  }

  private func isGenericCardPayment(_ text: String) -> Bool {
    let range = NSRange(text.startIndex..<text.endIndex, in: text)
    return genericCardPaymentExpression.firstMatch(in: text, range: range) != nil
  }

  private func walletTransaction(
    merchant: String,
    amount: Amount,
    sourceApp: String,
    capturedAt: Date
  ) -> NormalizedRecord {
    let timestamp = ISO8601DateFormatter().string(from: capturedAt)

    return NormalizedRecord(
      id: UUID().uuidString.lowercased(),
      bank: "millennium",
      direction: "expense",
      transactionType: "cardPayment",
      amountMinor: amount.minor,
      currency: amount.currency,
      merchant: merchantName(merchant),
      accountName: nil,
      occurredAt: timestamp,
      capturedAt: timestamp,
      sourceApp: sourceApp,
      status: "pending",
      origin: NormalizedRecordOrigin.capture,
      review: amount.isCurrencyRecognized ? nil : ReviewReason.currency
    )
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
      merchant: merchantName(String(text[merchantRange])),
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
    let parts = value
      .replacingOccurrences(of: #"\s"#, with: "", options: .regularExpression)
      .replacingOccurrences(of: ",", with: ".")
      .split(separator: ".")

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
