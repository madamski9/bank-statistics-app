import Foundation

public enum NotificationCaptureResult: Sendable {
  case saved(label: String, amountMinor: Int)
  case notTransaction
  case awaitingApplePay
  case alreadySaved
  case queued
}

public enum NotificationCapture {
  public static func capture(
    title: String,
    subtitle: String,
    body: String,
    sourceApp: String
  ) throws -> NotificationCaptureResult {
    do {
      let outcome = try EncryptedOutbox.shared.ingest(
        title: title,
        subtitle: subtitle,
        body: body,
        sourceApp: sourceApp
      )
      switch outcome {
      case .record(let record):
        IngestionAttemptLog.record { $0.recordSuccess() }
        let label = record.merchant ?? record.transactionType ?? "transaction"
        return .saved(label: label, amountMinor: record.amountMinor)
      case .pending(let reasonCode):
        IngestionAttemptLog.record { $0.recordPending(reasonCode) }
        return .queued
      case .ignored(let reasonCode):
        IngestionAttemptLog.record { $0.recordIgnored(reasonCode) }
        switch reasonCode {
        case IgnoredReason.notTransaction:
          return .notTransaction
        case IgnoredReason.cardPaymentAlreadySaved:
          return .alreadySaved
        default:
          return .awaitingApplePay
        }
      }
    } catch {
      let reasonCode = (error as? IngestionError)?.reasonCode ?? "unknown"
      IngestionAttemptLog.record { $0.recordFailure(reasonCode) }
      throw error
    }
  }
}
