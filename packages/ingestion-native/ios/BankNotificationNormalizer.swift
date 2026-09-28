import Foundation

struct BankNotificationNormalizer {
  func normalize(
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

    return try MillenniumNotificationNormalizer().normalize(
      subtitle: subtitle,
      body: body,
      sourceApp: sourceApp,
      capturedAt: capturedAt
    )
  }
}
