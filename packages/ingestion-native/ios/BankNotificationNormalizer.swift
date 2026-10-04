import Foundation

struct BankNotificationNormalizer {
  var interpreter: BankNotificationInterpreter?

  func normalize(
    title: String = "",
    subtitle: String,
    body: String,
    sourceApp: String,
    capturedAt: Date = Date()
  ) throws -> NormalizationOutcome {
    try (interpreter ?? BankNotificationInterpreter.bundled()).normalize(
      title: title,
      subtitle: subtitle,
      body: body,
      sourceApp: sourceApp,
      capturedAt: capturedAt
    )
  }
}
