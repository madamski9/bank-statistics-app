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
    static let lastFailureAt = "com.bankstats.ingestion.lastFailureAt"
    static let lastFailureReason = "com.bankstats.ingestion.lastFailureReason"
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
    let timestamp = ISO8601DateFormatter().string(from: date)
    defaults?.set(timestamp, forKey: Key.attemptedAt)
    defaults?.set("failure", forKey: Key.outcome)
    defaults?.set(reasonCode, forKey: Key.failureReason)
    defaults?.set(timestamp, forKey: Key.lastFailureAt)
    defaults?.set(reasonCode, forKey: Key.lastFailureReason)
  }

  /// The automation recognized the notification but deliberately did not persist it (e.g. a
  /// Millennium card-payment push deferred to the matching Apple Pay Wallet transaction). Distinct
  /// from `failure` so the diagnostics screen doesn't read a working automation as broken.
  func recordIgnored(_ reasonCode: String, at date: Date = Date()) {
    defaults?.set(ISO8601DateFormatter().string(from: date), forKey: Key.attemptedAt)
    defaults?.set("ignored", forKey: Key.outcome)
    defaults?.set(reasonCode, forKey: Key.failureReason)
  }

  func reset() {
    defaults?.removeObject(forKey: Key.attemptedAt)
    defaults?.removeObject(forKey: Key.outcome)
    defaults?.removeObject(forKey: Key.failureReason)
    defaults?.removeObject(forKey: Key.lastFailureAt)
    defaults?.removeObject(forKey: Key.lastFailureReason)
  }

  func snapshot() -> [String: String] {
    var values: [String: String] = [:]
    values["lastAttemptAt"] = defaults?.string(forKey: Key.attemptedAt)
    values["lastAttemptOutcome"] = defaults?.string(forKey: Key.outcome)
    values["lastAttemptFailureReason"] = defaults?.string(forKey: Key.failureReason)
    values["lastFailureAt"] = defaults?.string(forKey: Key.lastFailureAt)
    values["lastFailureReason"] = defaults?.string(forKey: Key.lastFailureReason)
    return values
  }
}

extension IngestionAttemptLog {
  /// The App Group attempt log is only reachable when ingestion is fully configured. Both
  /// capture intents (Millennium and Apple Pay) share this best-effort write so a background
  /// automation still returns/throws its real result even when the App Group is unreachable.
  static func record(_ write: (IngestionAttemptLog) -> Void) {
    guard let configuration = try? IngestionConfiguration.current() else {
      return
    }
    write(IngestionAttemptLog(configuration: configuration))
  }
}
