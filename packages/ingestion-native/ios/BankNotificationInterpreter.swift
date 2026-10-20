import Foundation

struct NotificationParsingAttempt: Codable, Sendable {
  let ruleId: String
  let reasonCode: String
  let groups: [String: String]
}

struct NotificationParsingTrace: Codable, Sendable {
  let parserVersion: Int
  let attempts: [NotificationParsingAttempt]
  var record: NormalizedRecord?
  let reasonCode: String?
}

enum RuleBundleError: Error {
  case unsupportedSchema(Int)
  case unknownFragment(String)
  case invalidPattern(String)
}

struct BankNotificationInterpreter: @unchecked Sendable {
  static let supportedSchemaVersion = 1

  private struct CompiledPattern {
    let expression: NSRegularExpression
    let groupNames: Set<String>
  }

  private typealias Groups = [String: String]
  private typealias Fields = [NotificationField: String]

  private static let fragmentPlaceholder = try! NSRegularExpression(pattern: #"\{\{(\w+)\}\}"#)
  private static let groupNamePattern = try! NSRegularExpression(pattern: #"\(\?<([A-Za-z][A-Za-z0-9]*)>"#)
  private static let formatTokenPattern = try! NSRegularExpression(pattern: "yyyy|MM|dd|HH|mm|ss")
  private static let threeLetterCode = try! NSRegularExpression(pattern: "^[A-Z]{3}$")

  let bundle: BankNotificationRuleBundle
  private let patterns: [String: CompiledPattern]

  var version: Int { bundle.version }

  init(bundle: BankNotificationRuleBundle) throws {
    guard bundle.schemaVersion == Self.supportedSchemaVersion else {
      throw RuleBundleError.unsupportedSchema(bundle.schemaVersion)
    }

    var compiled: [String: CompiledPattern] = [:]

    func compile(_ pattern: String, caseInsensitive: Bool?) throws {
      let key = Self.key(pattern, caseInsensitive: caseInsensitive)

      if compiled[key] != nil {
        return
      }

      let expanded = try Self.expand(pattern, fragments: bundle.fragments)

      do {
        let expression = try NSRegularExpression(
          pattern: expanded,
          options: caseInsensitive == true ? [.caseInsensitive] : []
        )
        compiled[key] = CompiledPattern(expression: expression, groupNames: Self.groupNames(in: expanded))
      } catch {
        throw RuleBundleError.invalidPattern(pattern)
      }
    }

    func compileMapped(_ value: MappedValue?) throws {
      if case .fieldMatch(_, let pattern, _, _) = value {
        try compile(pattern.pattern, caseInsensitive: pattern.caseInsensitive)
      }
    }

    for rule in bundle.rules {
      try compile(rule.match.pattern, caseInsensitive: rule.match.caseInsensitive)
      if let title = rule.requires?.title {
        try compile(title.pattern, caseInsensitive: title.caseInsensitive)
      }
      try compileMapped(rule.record?.bank)
      try compileMapped(rule.record?.direction)
      try compileMapped(rule.record?.transactionType)
    }

    try compile(
      bundle.merchantLocationSuffix.pattern,
      caseInsensitive: bundle.merchantLocationSuffix.caseInsensitive
    )

    self.bundle = bundle
    self.patterns = compiled
  }

  func normalize(
    title: String,
    subtitle: String,
    body: String,
    sourceApp: String,
    capturedAt: Date
  ) -> NormalizationOutcome {
    let trace = inspect(title: title, subtitle: subtitle, body: body, sourceApp: sourceApp, capturedAt: capturedAt)
    return trace.record.map { .record($0) } ?? .ignored(reasonCode: trace.reasonCode ?? bundle.fallbackIgnoreReason)
  }

  func inspect(
    title: String,
    subtitle: String,
    body: String,
    sourceApp: String,
    capturedAt: Date
  ) -> NotificationParsingTrace {
    var attempts: [NotificationParsingAttempt] = []

    for rule in bundle.rules {
      let fields: Fields = [
        .title: Self.collapseWhitespace(title, mode: rule.whitespace),
        .subtitle: Self.collapseWhitespace(subtitle, mode: rule.whitespace),
        .body: Self.collapseWhitespace(body, mode: rule.whitespace),
      ]

      guard meetsRequirements(rule, fields: fields) else {
        attempts.append(NotificationParsingAttempt(ruleId: rule.id, reasonCode: "requirementsMismatch", groups: [:]))
        continue
      }

      guard let groups = match(
        rule.match.pattern,
        caseInsensitive: rule.match.caseInsensitive,
        in: fields[rule.match.field] ?? ""
      ) else {
        attempts.append(NotificationParsingAttempt(ruleId: rule.id, reasonCode: "patternMismatch", groups: [:]))
        continue
      }

      if let reason = rule.ignore {
        attempts.append(NotificationParsingAttempt(ruleId: rule.id, reasonCode: reason, groups: groups))
        return NotificationParsingTrace(parserVersion: version, attempts: attempts, record: nil, reasonCode: reason)
      }

      if let record = record(rule, groups: groups, fields: fields, sourceApp: sourceApp, capturedAt: capturedAt) {
        attempts.append(NotificationParsingAttempt(ruleId: rule.id, reasonCode: "recognized", groups: groups))
        return NotificationParsingTrace(parserVersion: version, attempts: attempts, record: record, reasonCode: nil)
      }

      let reason: String
      if let template = rule.record,
        let amount = NotificationAmount.minorUnits(groups[template.amountGroup] ?? ""), amount > 0 {
        reason = template.occurredAt == nil ? "invalidRecord" : "invalidOccurrenceDate"
      } else {
        reason = "invalidAmount"
      }
      attempts.append(NotificationParsingAttempt(ruleId: rule.id, reasonCode: reason, groups: groups))
    }

    return NotificationParsingTrace(
      parserVersion: version, attempts: attempts, record: nil, reasonCode: bundle.fallbackIgnoreReason
    )
  }

  private func meetsRequirements(_ rule: NotificationRule, fields: Fields) -> Bool {
    if let title = rule.requires?.title,
      match(title.pattern, caseInsensitive: title.caseInsensitive, in: fields[.title] ?? "") == nil {
      return false
    }

    switch rule.requires?.subtitle {
    case "empty":
      return fields[.subtitle]?.isEmpty ?? true
    case "present":
      return !(fields[.subtitle]?.isEmpty ?? true)
    default:
      return true
    }
  }

  private func record(
    _ rule: NotificationRule,
    groups: Groups,
    fields: Fields,
    sourceApp: String,
    capturedAt: Date
  ) -> NormalizedRecord? {
    guard let template = rule.record,
      let amountMinor = NotificationAmount.minorUnits(groups[template.amountGroup] ?? ""),
      amountMinor > 0
    else {
      return nil
    }

    let formatter = ISO8601DateFormatter()
    var occurredAt = capturedAt

    if let source = template.occurredAt {
      guard let value = groups[source.group], let parsed = Self.parseOccurrence(value, source: source) else {
        return nil
      }
      occurredAt = parsed
    }

    let currencyValue = template.currencyGroups.lazy.compactMap { groups[$0] }.first { !$0.isEmpty }
    let currency = currencyValue.flatMap(currencyCode)
    var merchant: String?

    if let source = template.merchant {
      let raw = source.group.map { groups[$0] ?? "" } ?? source.field.flatMap { fields[$0] } ?? ""
      let cleaned = source.stripLocation == true
        ? merchantName(raw)
        : raw.trimmingCharacters(in: .whitespacesAndNewlines)
      merchant = cleaned.isEmpty ? nil : cleaned
    }

    let account = template.accountGroup
      .flatMap { groups[$0] }?
      .trimmingCharacters(in: .whitespacesAndNewlines)

    return NormalizedRecord(
      id: UUID().uuidString.lowercased(),
      bank: mapped(template.bank, groups: groups, fields: fields),
      direction: mapped(template.direction, groups: groups, fields: fields),
      transactionType: template.transactionType.map { mapped($0, groups: groups, fields: fields) },
      amountMinor: amountMinor,
      currency: currency ?? bundle.fallbackCurrency,
      merchant: merchant,
      accountName: account?.isEmpty == false ? account : nil,
      occurredAt: formatter.string(from: occurredAt),
      capturedAt: formatter.string(from: capturedAt),
      sourceApp: template.sourceApp ?? sourceApp,
      status: template.status,
      origin: NormalizedRecordOrigin.capture,
      review: currency == nil ? ReviewReason.currency : nil
    )
  }

  private func mapped(_ value: MappedValue, groups: Groups, fields: Fields) -> String {
    switch value {
    case .constant(let constant):
      return constant
    case .group(let name, let cases, let otherwise):
      return cases[(groups[name] ?? "").lowercased()] ?? otherwise
    case .fieldMatch(let field, let pattern, let whenMatched, let otherwise):
      let isMatched = match(pattern.pattern, caseInsensitive: pattern.caseInsensitive, in: fields[field] ?? "") != nil
      return isMatched ? whenMatched : otherwise
    }
  }

  private func currencyCode(_ symbol: String) -> String? {
    if let mapped = bundle.currencySymbols[symbol.lowercased()] {
      return mapped
    }

    let code = symbol.uppercased()
    let range = NSRange(code.startIndex..<code.endIndex, in: code)
    return Self.threeLetterCode.firstMatch(in: code, range: range) == nil ? nil : code
  }

  private func merchantName(_ value: String) -> String {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    let suffix = bundle.merchantLocationSuffix

    if let separator = trimmed.range(of: "  ") {
      let name = String(trimmed[trimmed.startIndex..<separator.lowerBound])
        .trimmingCharacters(in: .whitespacesAndNewlines)

      if !name.isEmpty,
        firstMatch(suffix.pattern, caseInsensitive: suffix.caseInsensitive, in: String(trimmed[separator.lowerBound...])) != nil
      {
        return name
      }
    }

    guard let match = firstMatch(suffix.pattern, caseInsensitive: suffix.caseInsensitive, in: trimmed),
      let range = Range(match.range, in: trimmed),
      range.lowerBound != trimmed.startIndex
    else {
      return trimmed
    }

    return String(trimmed[trimmed.startIndex..<range.lowerBound])
      .trimmingCharacters(in: .whitespacesAndNewlines)
  }

  private func firstMatch(_ pattern: String, caseInsensitive: Bool?, in text: String) -> NSTextCheckingResult? {
    guard let compiled = patterns[Self.key(pattern, caseInsensitive: caseInsensitive)] else {
      return nil
    }

    return compiled.expression.firstMatch(in: text, range: NSRange(text.startIndex..<text.endIndex, in: text))
  }

  private func match(_ pattern: String, caseInsensitive: Bool?, in text: String) -> Groups? {
    guard let compiled = patterns[Self.key(pattern, caseInsensitive: caseInsensitive)],
      let result = compiled.expression.firstMatch(in: text, range: NSRange(text.startIndex..<text.endIndex, in: text))
    else {
      return nil
    }

    var groups: Groups = [:]

    for name in compiled.groupNames {
      let range = result.range(withName: name)

      if range.location != NSNotFound, let bounds = Range(range, in: text) {
        groups[name] = String(text[bounds])
      }
    }

    return groups
  }

  private static func key(_ pattern: String, caseInsensitive: Bool?) -> String {
    "\(caseInsensitive == true ? "i" : ""):\(pattern)"
  }

  private static func expand(_ pattern: String, fragments: [String: String]) throws -> String {
    let source = pattern as NSString
    let matches = fragmentPlaceholder.matches(in: pattern, range: NSRange(location: 0, length: source.length))
    var expanded = ""
    var cursor = 0

    for match in matches {
      let name = source.substring(with: match.range(at: 1))

      guard let fragment = fragments[name] else {
        throw RuleBundleError.unknownFragment(name)
      }

      expanded += source.substring(with: NSRange(location: cursor, length: match.range.location - cursor))
      expanded += fragment
      cursor = match.range.location + match.range.length
    }

    expanded += source.substring(from: cursor)
    return expanded
  }

  private static func groupNames(in pattern: String) -> Set<String> {
    let source = pattern as NSString
    let matches = groupNamePattern.matches(in: pattern, range: NSRange(location: 0, length: source.length))
    return Set(matches.map { source.substring(with: $0.range(at: 1)) })
  }

  static func collapseWhitespace(_ value: String, mode: WhitespaceMode) -> String {
    switch mode {
    case .single:
      return value
        .replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
        .trimmingCharacters(in: .whitespacesAndNewlines)
    case .keepDoubleSpace:
      return value
        .replacingOccurrences(of: #"[^\S ]+"#, with: " ", options: .regularExpression)
        .replacingOccurrences(of: #" {2,}"#, with: "  ", options: .regularExpression)
        .trimmingCharacters(in: .whitespacesAndNewlines)
    }
  }

  private static func parseOccurrence(_ value: String, source: OccurrenceSource) -> Date? {
    guard let timeZone = TimeZone(identifier: source.timeZone) else {
      return nil
    }

    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timeZone

    for format in source.formats {
      guard let components = localComponents(value, format: format),
        let date = calendar.date(from: components)
      else {
        continue
      }

      let roundTrip = calendar.dateComponents([.year, .month, .day, .hour, .minute, .second], from: date)

      if roundTrip.year == components.year,
        roundTrip.month == components.month,
        roundTrip.day == components.day,
        roundTrip.hour == components.hour,
        roundTrip.minute == components.minute,
        roundTrip.second == components.second
      {
        return date
      }
    }

    return nil
  }

  private static func localComponents(_ value: String, format: String) -> DateComponents? {
    let source = format as NSString
    let tokens = formatTokenPattern.matches(in: format, range: NSRange(location: 0, length: source.length))
    var pattern = "^"
    var order: [String] = []
    var cursor = 0

    for token in tokens {
      pattern += NSRegularExpression.escapedPattern(
        for: source.substring(with: NSRange(location: cursor, length: token.range.location - cursor))
      )
      let name = source.substring(with: token.range)
      pattern += name == "yyyy" ? "([0-9]{4})" : "([0-9]{2})"
      order.append(name)
      cursor = token.range.location + token.range.length
    }

    pattern += NSRegularExpression.escapedPattern(for: source.substring(from: cursor)) + "$"

    guard let expression = try? NSRegularExpression(pattern: pattern),
      let match = expression.firstMatch(in: value, range: NSRange(value.startIndex..<value.endIndex, in: value))
    else {
      return nil
    }

    var components = DateComponents(year: 0, month: 1, day: 1, hour: 0, minute: 0, second: 0)

    for (index, name) in order.enumerated() {
      guard let range = Range(match.range(at: index + 1), in: value), let number = Int(value[range]) else {
        return nil
      }

      switch name {
      case "yyyy": components.year = number
      case "MM": components.month = number
      case "dd": components.day = number
      case "HH": components.hour = number
      case "mm": components.minute = number
      default: components.second = number
      }
    }

    return components
  }
}
