import Foundation

enum NotificationAdmission {
  private static let amount = #"(?:[0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{1,2})?|[0-9]{1,3}(?:\h[0-9]{3})+(?:[.,][0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?)"#
  private static let currency = (Locale.commonISOCurrencyCodes + ["zł", "zl", "€", "$", "£", "¥", "₣"])
    .map(NSRegularExpression.escapedPattern(for:))
    .joined(separator: "|")
  private static let money = try! NSRegularExpression(
    pattern: #"(?<![\p{L}\p{N}.,])(?:[+−-]\h*)?(?:(?<currencyBefore>"# + currency
      + #")\h*(?:[+−-]\h*)?(?<amountAfter>"# + amount + #")|(?<amountBefore>"# + amount
      + #")\h*(?<currencyAfter>"# + currency + #"))(?![\p{L}\p{N}]|[.,][0-9])"#,
    options: [.caseInsensitive]
  )
  private static let walletAmount = try! NSRegularExpression(pattern: #"^[−-]?\h*"# + amount + #"$"#)
  private static let marketing = try! NSRegularExpression(
    pattern: #"(?:^|[.!?]\s+)(?:masz\s+do\s+odebrania\b|mamy\s+dla\s+ciebie\b|dla\s+ciebie\b|[0-9][^.!?\n]{0,40}\b(?:premii|bonusu|rabatu)\s+za\b|skorzystaj\b|zyskaj\b|zgarnij\b|odbierz\b|sprawdź\s+(?:ofertę|promocję)|(?:weź|wez|zamów|zamow)\s+(?:kredyt|pożyczkę|pozyczke)|(?:oferta|promocja|rabat|cashback)\b|(?:kredyt|pożyczka|pozyczka)\s+(?:dla\s+ciebie|do\b)|(?:get|claim|earn)\s+(?:up\s+to\s+)?[0-9]|(?:special\s+offer|apply\s+for\s+a\s+loan)\b)"#,
    options: [.caseInsensitive]
  )

  static func accepts(title: String, subtitle: String, body: String) -> Bool {
    if matches(marketing, in: title) || matches(marketing, in: body) {
      return false
    }

    if [title, subtitle, body].contains(where: { matches(money, in: $0) }) {
      return true
    }

    return !subtitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      && matches(walletAmount, in: body.trimmingCharacters(in: .whitespacesAndNewlines))
  }

  private static func matches(_ expression: NSRegularExpression, in value: String) -> Bool {
    expression.firstMatch(in: value, range: NSRange(value.startIndex..<value.endIndex, in: value)) != nil
  }
}
