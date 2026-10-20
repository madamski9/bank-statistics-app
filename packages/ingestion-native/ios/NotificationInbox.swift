import Foundation
import SQLCipher

struct CapturedNotification: Codable, Equatable {
  let id: String
  let title: String
  let subtitle: String
  let body: String
  let sourceApp: String
  let capturedAt: Date

  var dictionary: [String: Any] {
    ["id": id, "title": title, "subtitle": subtitle, "body": body, "sourceApp": sourceApp,
      "capturedAt": ISO8601DateFormatter().string(from: capturedAt)]
  }

  init(title: String, subtitle: String, body: String, sourceApp: String, capturedAt: Date = Date()) {
    id = UUID().uuidString.lowercased()
    self.title = title
    self.subtitle = subtitle
    self.body = body
    self.sourceApp = sourceApp
    self.capturedAt = capturedAt
  }
}

enum NotificationIngestionOutcome {
  case record(NormalizedRecord)
  case ignored(reasonCode: String)
  case pending(reasonCode: String)
}

struct NotificationInbox {
  static let retention: TimeInterval = 30 * 24 * 60 * 60

  let database: OpaquePointer
  private let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

  func prepare() throws {
    try execute(
      "CREATE TABLE IF NOT EXISTS notification_inbox (id TEXT PRIMARY KEY, payload BLOB NOT NULL, captured_at REAL NOT NULL, rules_version INTEGER, requires_recognition INTEGER NOT NULL DEFAULT 1)"
    )
    let columns = try statement("PRAGMA table_info(notification_inbox)") { statement in
      var names: Set<String> = []
      var status = sqlite3_step(statement)
      while status == SQLITE_ROW {
        if let name = sqlite3_column_text(statement, 1) {
          names.insert(String(cString: name))
        }
        status = sqlite3_step(statement)
      }
      try check(status, accepted: SQLITE_DONE)
      return names
    }
    if !columns.contains("diagnostic") {
      try execute("ALTER TABLE notification_inbox ADD COLUMN diagnostic TEXT")
    }
  }

  func expire(at now: Date = Date()) throws {
    try statement("DELETE FROM notification_inbox WHERE captured_at <= ?") { statement in
      try check(sqlite3_bind_double(statement, 1, now.addingTimeInterval(-Self.retention).timeIntervalSince1970))
      try check(sqlite3_step(statement), accepted: SQLITE_DONE)
    }
  }

  func enqueue(_ notification: CapturedNotification) throws {
    try statement("INSERT INTO notification_inbox (id, payload, captured_at) VALUES (?, ?, ?)") { statement in
      let payload = try JSONEncoder().encode(notification)
      try bind(notification.id, to: 1, in: statement)
      try check(payload.withUnsafeBytes { sqlite3_bind_blob(statement, 2, $0.baseAddress, Int32($0.count), transient) })
      try check(sqlite3_bind_double(statement, 3, notification.capturedAt.timeIntervalSince1970))
      try check(sqlite3_step(statement), accepted: SQLITE_DONE)
    }
  }

  func pending(rulesVersion: Int) throws -> [CapturedNotification] {
    try statement(
      "SELECT payload FROM notification_inbox WHERE rules_version IS NULL OR rules_version != ? OR diagnostic IS NULL ORDER BY captured_at, id LIMIT 50"
    ) { statement in
      try check(sqlite3_bind_int64(statement, 1, Int64(rulesVersion)))
      var notifications: [CapturedNotification] = []
      var status = sqlite3_step(statement)

      while status == SQLITE_ROW {
        if let bytes = sqlite3_column_blob(statement, 0) {
          let data = Data(bytes: bytes, count: Int(sqlite3_column_bytes(statement, 0)))
          notifications.append(try JSONDecoder().decode(CapturedNotification.self, from: data))
        }
        status = sqlite3_step(statement)
      }

      try check(status, accepted: SQLITE_DONE)
      return notifications
    }
  }

  func process(
    _ notification: CapturedNotification,
    interpreter: BankNotificationInterpreter,
    save: (NormalizedRecord) throws -> NormalizedRecord?
  ) throws -> NotificationIngestionOutcome {
    try execute("BEGIN IMMEDIATE")
    var trace: NotificationParsingTrace?

    do {
      let exists = try statement("SELECT 1 FROM notification_inbox WHERE id = ?") { statement in
        try bind(notification.id, to: 1, in: statement)
        let status = sqlite3_step(statement)
        if status == SQLITE_DONE {
          return false
        }
        try check(status, accepted: SQLITE_ROW)
        return true
      }

      guard exists else {
        try execute("COMMIT")
        return .ignored(reasonCode: IgnoredReason.cardPaymentAlreadySaved)
      }

      var inspected = interpreter.inspect(
        title: notification.title,
        subtitle: notification.subtitle,
        body: notification.body,
        sourceApp: notification.sourceApp,
        capturedAt: notification.capturedAt
      )
      if inspected.record != nil {
        inspected.record?.id = notification.id
      }
      trace = inspected
      let result: NotificationIngestionOutcome

      if let record = inspected.record {
        let stored = try save(record)
        try statement("DELETE FROM notification_inbox WHERE id = ?") { statement in
          try bind(notification.id, to: 1, in: statement)
          try check(sqlite3_step(statement), accepted: SQLITE_DONE)
        }
        result = stored.map { .record($0) } ?? .ignored(reasonCode: IgnoredReason.cardPaymentAlreadySaved)
      } else {
        let reasonCode = inspected.reasonCode ?? IgnoredReason.notTransaction
        let awaitingWallet = reasonCode == IgnoredReason.cardPaymentAwaitingApplePay
        try statement("UPDATE notification_inbox SET rules_version = ?, requires_recognition = ? WHERE id = ?") { statement in
          try check(sqlite3_bind_int64(statement, 1, Int64(interpreter.version)))
          try check(sqlite3_bind_int(statement, 2, awaitingWallet ? 0 : 1))
          try bind(notification.id, to: 3, in: statement)
          try check(sqlite3_step(statement), accepted: SQLITE_DONE)
        }
        try saveDiagnostic(id: notification.id, trace: inspected, failureReason: nil)
        result = awaitingWallet
          ? .ignored(reasonCode: reasonCode)
          : .pending(reasonCode: reasonCode == IgnoredReason.notTransaction ? "unsupportedNotification" : reasonCode)
      }

      try execute("COMMIT")
      return result
    } catch {
      try? execute("ROLLBACK")
      try? saveDiagnostic(id: notification.id, trace: trace, failureReason: (error as? IngestionError)?.reasonCode ?? "unknown")
      throw error
    }
  }

  func notification(id: String) throws -> CapturedNotification? {
    try statement("SELECT payload FROM notification_inbox WHERE id = ?") { statement in
      try bind(id, to: 1, in: statement)
      let status = sqlite3_step(statement)
      if status == SQLITE_DONE { return nil }
      try check(status, accepted: SQLITE_ROW)
      guard let bytes = sqlite3_column_blob(statement, 0) else { return nil }
      return try JSONDecoder().decode(
        CapturedNotification.self, from: Data(bytes: bytes, count: Int(sqlite3_column_bytes(statement, 0)))
      )
    }
  }

  func diagnostics(offset: Int) throws -> [[String: Any]] {
    try statement(
      "SELECT payload, diagnostic, rules_version FROM notification_inbox WHERE requires_recognition = 1 ORDER BY captured_at DESC, id DESC LIMIT 50 OFFSET ?"
    ) { statement in
      try check(sqlite3_bind_int64(statement, 1, Int64(max(0, offset))))
      var entries: [[String: Any]] = []
      var status = sqlite3_step(statement)
      while status == SQLITE_ROW {
        if let bytes = sqlite3_column_blob(statement, 0) {
          let notification = try JSONDecoder().decode(
            CapturedNotification.self, from: Data(bytes: bytes, count: Int(sqlite3_column_bytes(statement, 0)))
          )
          var entry = notification.dictionary
          if let diagnostic = sqlite3_column_text(statement, 1) {
            entry["diagnosticJson"] = String(cString: diagnostic)
          }
          if sqlite3_column_type(statement, 2) != SQLITE_NULL {
            entry["rulesVersion"] = Int(sqlite3_column_int64(statement, 2))
          }
          entries.append(entry)
        }
        status = sqlite3_step(statement)
      }
      try check(status, accepted: SQLITE_DONE)
      return entries
    }
  }

  func restore(id: String, save: (CapturedNotification) throws -> NormalizedRecord) throws -> NormalizedRecord {
    try execute("BEGIN IMMEDIATE")
    do {
      guard let notification = try notification(id: id) else {
        throw IngestionError.notificationUnavailable
      }
      let record = try save(notification)
      try statement("DELETE FROM notification_inbox WHERE id = ?") { statement in
        try bind(id, to: 1, in: statement)
        try check(sqlite3_step(statement), accepted: SQLITE_DONE)
      }
      try execute("COMMIT")
      return record
    } catch {
      try? execute("ROLLBACK")
      throw error
    }
  }

  func saveDiagnostic(id: String, trace: NotificationParsingTrace?, failureReason: String?) throws {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    var diagnostic: [String: Any] = ["attemptedAt": ISO8601DateFormatter().string(from: Date())]
    diagnostic["parser"] = try trace.map { try JSONSerialization.jsonObject(with: encoder.encode($0)) } ?? NSNull()
    diagnostic["failureReason"] = failureReason ?? NSNull()
    let data = try JSONSerialization.data(withJSONObject: diagnostic, options: [.sortedKeys])
    guard let value = String(data: data, encoding: .utf8) else { return }
    try statement("UPDATE notification_inbox SET diagnostic = ? WHERE id = ?") { statement in
      try bind(value, to: 1, in: statement)
      try bind(id, to: 2, in: statement)
      try check(sqlite3_step(statement), accepted: SQLITE_DONE)
    }
  }

  func clear() throws {
    try execute("DELETE FROM notification_inbox")
  }

  private func statement<Result>(_ sql: String, work: (OpaquePointer) throws -> Result) throws -> Result {
    var statement: OpaquePointer?
    try check(sqlite3_prepare_v2(database, sql, -1, &statement, nil))
    guard let statement else {
      throw IngestionError.database("Could not prepare the notification inbox operation")
    }
    defer { sqlite3_finalize(statement) }
    return try work(statement)
  }

  private func bind(_ value: String, to index: Int32, in statement: OpaquePointer) throws {
    try check(sqlite3_bind_text(statement, index, value, -1, transient))
  }

  private func execute(_ sql: String) throws {
    try check(sqlite3_exec(database, sql, nil, nil, nil))
  }

  private func check(_ status: Int32, accepted: Int32 = SQLITE_OK) throws {
    guard status == accepted else {
      throw IngestionError.database(String(cString: sqlite3_errmsg(database)))
    }
  }
}
