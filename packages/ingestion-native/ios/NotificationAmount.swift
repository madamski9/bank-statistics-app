import Foundation

enum NotificationAmount {
  static let groupedPattern = #"(?:[0-9]{1,3}(?:\s[0-9]{3})+|[0-9]+)(?:[,.][0-9]{1,2})?"#

  static func minorUnits(_ value: String) -> Int? {
    let parts = value
      .replacingOccurrences(of: #"\s"#, with: "", options: .regularExpression)
      .replacingOccurrences(of: ",", with: ".")
      .split(separator: ".")

    guard !parts.isEmpty, parts.count <= 2, let whole = Int(parts[0]) else {
      return nil
    }

    let fraction = parts.count == 2 ? String(parts[1]) : ""
    let paddedFraction = fraction.padding(toLength: 2, withPad: "0", startingAt: 0)

    guard paddedFraction.count == 2, let minor = Int(paddedFraction) else {
      return nil
    }

    return whole * 100 + minor
  }
}
