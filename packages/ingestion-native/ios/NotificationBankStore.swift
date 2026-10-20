import Foundation
import SQLCipher

struct NotificationBankStore {
  let database: OpaquePointer
  private let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

  func prepare() throws {
    try check(sqlite3_exec(database,
      "CREATE TABLE IF NOT EXISTS notification_banks (source_app TEXT NOT NULL, title TEXT NOT NULL, name TEXT NOT NULL, PRIMARY KEY (source_app, title))",
      nil, nil, nil))
  }

  func remember(for record: NormalizedRecord, name: String) throws {
    let name = name.trimmingCharacters(in: .whitespacesAndNewlines)
    guard let title = sourceTitle(record), !name.isEmpty, name.unicodeScalars.count <= 60 else {
      throw IngestionError.invalidRecord
    }
    try statement("INSERT OR REPLACE INTO notification_banks (source_app, title, name) VALUES (?, ?, ?)") { statement in
      try bind(record.sourceApp, to: 1, in: statement)
      try bind(title, to: 2, in: statement)
      try bind(name, to: 3, in: statement)
      try check(sqlite3_step(statement), accepted: SQLITE_DONE)
    }
  }

  func applying(to record: NormalizedRecord) throws -> NormalizedRecord {
    guard let title = sourceTitle(record) else { return record }
    let name = try statement("SELECT name FROM notification_banks WHERE source_app = ? AND title = ?") { statement -> String? in
      try bind(record.sourceApp, to: 1, in: statement)
      try bind(title, to: 2, in: statement)
      let status = sqlite3_step(statement)
      if status == SQLITE_DONE { return nil }
      try check(status, accepted: SQLITE_ROW)
      return sqlite3_column_text(statement, 0).map { String(cString: $0) }
    }
    var result = record
    if let name { result.bankName = name }
    return result
  }

  func matchesSource(_ left: NormalizedRecord, _ right: NormalizedRecord) -> Bool {
    guard let leftTitle = sourceTitle(left), let rightTitle = sourceTitle(right) else { return false }
    return left.sourceApp == right.sourceApp && leftTitle == rightTitle
  }

  private func sourceTitle(_ record: NormalizedRecord) -> String? {
    guard record.bank == "unknown", record.origin != NormalizedRecordOrigin.manual,
      !record.sourceApp.isEmpty, let title = record.notificationTitle else { return nil }
    let normalized = title.split(whereSeparator: \.isWhitespace).joined(separator: " ")
      .lowercased(with: Locale(identifier: "en_US_POSIX"))
    return normalized.isEmpty ? nil : normalized
  }

  private func statement<Result>(_ sql: String, work: (OpaquePointer) throws -> Result) throws -> Result {
    var statement: OpaquePointer?
    try check(sqlite3_prepare_v2(database, sql, -1, &statement, nil))
    guard let statement else { throw IngestionError.database("Could not prepare notification bank storage") }
    defer { sqlite3_finalize(statement) }
    return try work(statement)
  }

  private func bind(_ value: String, to index: Int32, in statement: OpaquePointer) throws {
    try check(sqlite3_bind_text(statement, index, value, -1, transient))
  }

  private func check(_ status: Int32, accepted: Int32 = SQLITE_OK) throws {
    guard status == accepted else { throw IngestionError.database(String(cString: sqlite3_errmsg(database))) }
  }
}
