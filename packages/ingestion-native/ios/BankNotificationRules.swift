import Foundation

struct RulePattern: Decodable, Sendable {
  let pattern: String
  let caseInsensitive: Bool?
}

enum NotificationField: String, Decodable, Sendable {
  case title
  case subtitle
  case body
}

enum WhitespaceMode: String, Decodable, Sendable {
  case single
  case keepDoubleSpace
}

enum MappedValue: Decodable, Sendable {
  case constant(String)
  case group(name: String, cases: [String: String], otherwise: String)
  case fieldMatch(field: NotificationField, pattern: RulePattern, whenMatched: String, otherwise: String)

  private enum CodingKeys: String, CodingKey {
    case group
    case cases
    case otherwise
    case field
    case pattern
    case caseInsensitive
    case whenMatched
  }

  init(from decoder: Decoder) throws {
    if let value = try? decoder.singleValueContainer().decode(String.self) {
      self = .constant(value)
      return
    }

    let container = try decoder.container(keyedBy: CodingKeys.self)
    let otherwise = try container.decode(String.self, forKey: .otherwise)

    if let group = try container.decodeIfPresent(String.self, forKey: .group) {
      self = .group(
        name: group,
        cases: try container.decode([String: String].self, forKey: .cases),
        otherwise: otherwise
      )
      return
    }

    self = .fieldMatch(
      field: try container.decode(NotificationField.self, forKey: .field),
      pattern: RulePattern(
        pattern: try container.decode(String.self, forKey: .pattern),
        caseInsensitive: try container.decodeIfPresent(Bool.self, forKey: .caseInsensitive)
      ),
      whenMatched: try container.decode(String.self, forKey: .whenMatched),
      otherwise: otherwise
    )
  }
}

struct MerchantSource: Decodable, Sendable {
  let group: String?
  let field: NotificationField?
  let stripLocation: Bool?
}

struct OccurrenceSource: Decodable, Sendable {
  let group: String
  let formats: [String]
  let timeZone: String
}

struct RecordTemplate: Decodable, Sendable {
  let bank: MappedValue
  let sourceApp: String?
  let direction: MappedValue
  let transactionType: MappedValue?
  let amountGroup: String
  let currencyGroups: [String]
  let merchant: MerchantSource?
  let accountGroup: String?
  let occurredAt: OccurrenceSource?
  let status: String
}

struct RuleRequirements: Decodable, Sendable {
  let subtitle: String?
}

struct RuleMatch: Decodable, Sendable {
  let field: NotificationField
  let pattern: String
  let caseInsensitive: Bool?
}

struct NotificationRule: Decodable, Sendable {
  let id: String
  let whitespace: WhitespaceMode
  let requires: RuleRequirements?
  let match: RuleMatch
  let ignore: String?
  let record: RecordTemplate?
}

struct BankNotificationRuleBundle: Decodable, Sendable {
  let schemaVersion: Int
  let version: Int
  let fragments: [String: String]
  let currencySymbols: [String: String]
  let fallbackCurrency: String
  let merchantLocationSuffix: RulePattern
  let fallbackIgnoreReason: String
  let rules: [NotificationRule]
}
