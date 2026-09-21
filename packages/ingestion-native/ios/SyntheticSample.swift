import Foundation

enum SyntheticSample {
  struct Notification {
    let subtitle: String
    let body: String
  }

  /// Millennium's own card-payment push, which the normalizer recognizes and drops in favour of
  /// the Wallet one below. Kept so the ignored path stays exercisable. A bank push carries no
  /// subtitle, which is half of what tells the two apart.
  static let millennium = Notification(
    subtitle: "",
    body: "Płatność kartą: 12,34 PLN w SKLEP TEST."
  )
  /// The Apple Pay/Wallet push for the same purchase — this is the one that becomes a record.
  /// Shaped exactly like the real one, location suffix and amount-only body included, so
  /// exercising it proves the path an actual payment takes rather than a tidier one it never
  /// produces.
  static let applePay = Notification(
    subtitle: "SKLEP TEST  Gdańsk, Pomorskie",
    body: "12,34 zł"
  )
  static let sourceApp = "pl.millenniumbank.bankmillennium"
  /// Both samples carry it, so it still identifies every synthetic record on the delete path.
  static let merchant = "SKLEP TEST"
}
