import Foundation

enum CardPaymentResolution: Equatable {
  case insert
  case keepExisting(id: String)
  case replace(NormalizedRecord)
}

struct CardPaymentPairing {
  static let walletSourceApp = "com.apple.Passbook"
  static let window: TimeInterval = 10 * 60
  static let millenniumWindow: TimeInterval = 3 * 60 * 60
  static let declinedWalletPairing = "declined"
  static let lateCaptureAllowance: TimeInterval = 60 * 60

  let paired: Set<String>

  static func capturedRange(around record: NormalizedRecord) -> (from: String, to: String)? {
    guard let capturedAt = date(record.capturedAt) else {
      return nil
    }
    let occurredAt = date(record.occurredAt) ?? capturedAt
    let margin = pairingWindow(for: record.bank) + lateCaptureAllowance
    let formatter = ISO8601DateFormatter()
    return (
      formatter.string(from: min(capturedAt, occurredAt).addingTimeInterval(-margin)),
      formatter.string(from: max(capturedAt, occurredAt).addingTimeInterval(margin))
    )
  }

  func resolve(_ record: NormalizedRecord, existing: [NormalizedRecord]) -> CardPaymentResolution {
    guard Self.isCapturedCardPayment(record), Self.date(record.capturedAt) != nil else {
      return .insert
    }

    let counterpart = existing
      .filter { candidate in
        candidate.id != record.id
          && !paired.contains(candidate.id)
          && candidate.walletPairing != Self.declinedWalletPairing
          && Self.isCapturedCardPayment(candidate)
          && Self.isWallet(candidate) != Self.isWallet(record)
          && candidate.bank == record.bank
          && candidate.amountMinor == record.amountMinor
          && candidate.currency == record.currency
      }
      .compactMap { candidate -> (record: NormalizedRecord, distance: TimeInterval)? in
        guard let distance = Self.distance(between: record, and: candidate) else {
          return nil
        }
        return distance <= Self.pairingWindow(for: record.bank) ? (candidate, distance) : nil
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

  static func pairingWindow(for bank: String) -> TimeInterval {
    bank == "millennium" ? millenniumWindow : window
  }

  private static func isCapturedCardPayment(_ record: NormalizedRecord) -> Bool {
    record.transactionType == "cardPayment"
      && record.direction == "expense"
      && record.origin != NormalizedRecordOrigin.manual
      && record.bank != "unknown"
  }

  private static func isWallet(_ record: NormalizedRecord) -> Bool {
    record.sourceApp == walletSourceApp || isMillenniumPaymentWithMerchant(record)
  }

  private static func isMillenniumPaymentWithMerchant(_ record: NormalizedRecord) -> Bool {
    record.bank == "millennium" && record.merchant != nil
  }

  private static func distance(between record: NormalizedRecord, and candidate: NormalizedRecord) -> TimeInterval? {
    guard let capturedAt = date(record.capturedAt), let candidateCapturedAt = date(candidate.capturedAt) else {
      return nil
    }
    let occurredAt = date(record.occurredAt) ?? capturedAt
    let candidateOccurredAt = date(candidate.occurredAt) ?? candidateCapturedAt
    return min(
      abs(candidateCapturedAt.timeIntervalSince(capturedAt)),
      abs(candidateOccurredAt.timeIntervalSince(occurredAt))
    )
  }

  private static func date(_ value: String) -> Date? {
    ISO8601DateFormatter().date(from: value)
  }
}
