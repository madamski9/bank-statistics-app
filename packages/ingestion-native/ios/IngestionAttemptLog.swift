import Foundation

/// Records whether the background App Intent ran at all, independent of whether the
/// SQLCipher outbox write it attempted succeeded. This is the only signal available to
/// distinguish "the automation never fired" from "it fired and failed to normalize or
/// persist the notification" once the JS diagnostics screen is the only observer left.
///
/// Never store the raw notification text here: only a timestamp and a coarse failure code.
struct IngestionAttemptLog {
  private enum Key {
    static let attemptedAt = "com.bankstats.ingestion.lastAttemptAt"
    static let outcome = "com.bankstats.ingestion.lastAttemptOutcome"
    static let failureReason = "com.bankstats.ingestion.lastAttemptFailureReason"
  }

  private let defaults: UserDefaults?

  init(configuration: IngestionConfiguration) {
    defaults = UserDefaults(suiteName: configuration.appGroupIdentifier)
  }

  func recordSuccess(at date: Date = Date()) {
    defaults?.set(ISO8601DateFormatter().string(from: date), forKey: Key.attemptedAt)
    defaults?.set("success", forKey: Key.outcome)
    defaults?.removeObject(forKey: Key.failureReason)
  }

  func recordFailure(_ reasonCode: String, at date: Date = Date()) {
    defaults?.set(ISO8601DateFormatter().string(from: date), forKey: Key.attemptedAt)
    defaults?.set("failure", forKey: Key.outcome)
    defaults?.set(reasonCode, forKey: Key.failureReason)
  }

  func snapshot() -> [String: String] {
    var values: [String: String] = [:]
    values["lastAttemptAt"] = defaults?.string(forKey: Key.attemptedAt)
    values["lastAttemptOutcome"] = defaults?.string(forKey: Key.outcome)
    values["lastAttemptFailureReason"] = defaults?.string(forKey: Key.failureReason)
    return values
  }
}
