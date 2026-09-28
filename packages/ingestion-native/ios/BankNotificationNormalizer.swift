import Foundation

struct BankNotificationNormalizer {
  func normalize(
    title: String = "",
    subtitle: String,
    body: String,
    sourceApp: String,
    capturedAt: Date = Date()
  ) throws -> NormalizationOutcome {
    let flattenedBody = body
      .replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
      .trimmingCharacters(in: .whitespacesAndNewlines)

    if subtitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
      let record = PkoNotificationNormalizer().record(body: flattenedBody, capturedAt: capturedAt) {
      return .record(record)
    }

    return try MillenniumNotificationNormalizer(walletBank: walletBank(title: title)).normalize(
      subtitle: subtitle,
      body: body,
      sourceApp: sourceApp,
      capturedAt: capturedAt
    )
  }

  private func walletBank(title: String) -> String {
    title.range(of: #"(?i)\bpko\b"#, options: .regularExpression) != nil ? "pko" : "millennium"
  }
}
