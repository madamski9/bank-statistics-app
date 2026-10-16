import Foundation

enum CardPaymentResolution: Equatable {
  case insert
  case keepExisting(id: String)
  case replace(NormalizedRecord)
}

struct CardPaymentPairing {
  static let walletSourceApp = "com.apple.Passbook"
  static let window: TimeInterval = 10 * 60

  let paired: Set<String>

  static func capturedRange(around record: NormalizedRecord) -> (from: String, to: String)? {
    guard let capturedAt = date(record.capturedAt) else {
      return nil
    }
    let formatter = ISO8601DateFormatter()
    return (
      formatter.string(from: capturedAt.addingTimeInterval(-window)),
      formatter.string(from: capturedAt.addingTimeInterval(window))
    )
  }

  func resolve(_ record: NormalizedRecord, existing: [NormalizedRecord]) -> CardPaymentResolution {
    guard Self.isCapturedCardPayment(record), let capturedAt = Self.date(record.capturedAt) else {
      return .insert
    }

    let counterpart = existing
      .filter { candidate in
        candidate.id != record.id
          && !paired.contains(candidate.id)
          && Self.isCapturedCardPayment(candidate)
          && Self.isWallet(candidate) != Self.isWallet(record)
          && candidate.bank == record.bank
          && candidate.amountMinor == record.amountMinor
          && candidate.currency == record.currency
      }
      .compactMap { candidate -> (record: NormalizedRecord, distance: TimeInterval)? in
        guard let candidateCapturedAt = Self.date(candidate.capturedAt) else {
          return nil
        }
        let distance = abs(candidateCapturedAt.timeIntervalSince(capturedAt))
        return distance <= Self.window ? (candidate, distance) : nil
      }
      .min { $0.distance < $1.distance }?
      .record

    guard let counterpart else {
      return .insert
    }

    guard Self.isWallet(record), let merchant = record.merchant else {
      return .keepExisting(id: counterpart.id)
    }

    var merged = counterpart
    merged.merchant = merchant
    return .replace(merged)
  }

  private static func isCapturedCardPayment(_ record: NormalizedRecord) -> Bool {
    record.transactionType == "cardPayment"
      && record.direction == "expense"
      && record.origin != NormalizedRecordOrigin.manual
      && record.bank != "unknown"
  }

  private static func isWallet(_ record: NormalizedRecord) -> Bool {
    record.sourceApp == walletSourceApp
  }

  private static func date(_ value: String) -> Date? {
    ISO8601DateFormatter().date(from: value)
  }
}
