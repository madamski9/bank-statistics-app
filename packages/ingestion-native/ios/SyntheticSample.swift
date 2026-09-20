import Foundation

enum SyntheticSample {
  /// Millennium's own card-payment push, which the normalizer now recognizes and drops in
  /// favour of the Wallet one below. Kept so the ignored path stays exercisable.
  static let rawText = "Płatność kartą: 12,34 PLN w SKLEP TEST."
  /// The Apple Pay/Wallet push for the same purchase — this is the one that becomes a record.
  static let applePayRawText = "Bank Millennium S.A.\nSKLEP TEST\n12,34 zł"
  static let sourceApp = "com.bankmillennium.mobile"
  /// Both samples carry it, so it still identifies every synthetic record on the delete path.
  static let merchant = "SKLEP TEST"
}
