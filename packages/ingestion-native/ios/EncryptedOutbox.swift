import Foundation
import SQLCipher

final class EncryptedOutbox: @unchecked Sendable {
  static let shared = EncryptedOutbox()

  private let queue = DispatchQueue(label: "com.bankstats.ingestion.outbox")
  private let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

  func ingest(
    title: String = "",
    subtitle: String,
    body: String,
    sourceApp: String
  ) throws -> NormalizationOutcome {
    let outcome = try BankNotificationNormalizer().normalize(
      title: title,
      subtitle: subtitle,
      body: body,
      sourceApp: sourceApp
    )
    guard case .record(let record) = outcome else {
      return outcome
    }
    try persist(record)
    SpendingWidgetUpdater.shared.refresh()
    return outcome
  }

  func save(_ record: NormalizedRecord) throws {
    try persist(record)
    SpendingWidgetUpdater.shared.refresh()
  }

  func delete(id: String) throws -> Int {
    let deletedCount = try serialized {
      let database = try openDatabase()
      defer { sqlite3_close(database) }
      let sql = "DELETE FROM outbox WHERE id = ?"
      var statement: OpaquePointer?
      try check(sqlite3_prepare_v2(database, sql, -1, &statement, nil), database)
      defer { sqlite3_finalize(statement) }
      try check(sqlite3_bind_text(statement, 1, id, -1, transient), database)
      try check(sqlite3_step(statement), database, accepted: [SQLITE_DONE])
      return Int(sqlite3_changes(database))
    }
    if deletedCount > 0 {
      SpendingWidgetUpdater.shared.refresh()
    }
    return deletedCount
  }

  private func persist(_ record: NormalizedRecord) throws {
    try serialized {
      let database = try openDatabase()
      defer { sqlite3_close(database) }
      let sql = "INSERT OR REPLACE INTO outbox (id, payload, captured_at) VALUES (?, ?, ?)"
      var statement: OpaquePointer?
      try check(sqlite3_prepare_v2(database, sql, -1, &statement, nil), database)
      defer { sqlite3_finalize(statement) }
      let payload = try JSONEncoder().encode(record)
      try check(sqlite3_bind_text(statement, 1, record.id, -1, transient), database)
      let payloadStatus = payload.withUnsafeBytes { bytes in
        sqlite3_bind_blob(statement, 2, bytes.baseAddress, Int32(bytes.count), transient)
      }
      try check(payloadStatus, database)
      try check(sqlite3_bind_text(statement, 3, record.capturedAt, -1, transient), database)
      try check(sqlite3_step(statement), database, accepted: [SQLITE_DONE])
    }
  }

  func clear() throws {
    defer { SpendingWidgetUpdater.shared.refresh() }
    try serialized {
      let configuration = try IngestionConfiguration.current()
      let database = try openDatabase(configuration: configuration)
      defer { sqlite3_close(database) }
      try execute("DELETE FROM outbox", database: database)
      try execute("DELETE FROM documents", database: database)
      IngestionAttemptLog(configuration: configuration).reset()
    }
  }

  func readDocument(key: String) throws -> String? {
    try serialized {
      let database = try openDatabase()
      defer { sqlite3_close(database) }
      let sql = "SELECT value FROM documents WHERE key = ?"
      var statement: OpaquePointer?
      try check(sqlite3_prepare_v2(database, sql, -1, &statement, nil), database)
      defer { sqlite3_finalize(statement) }
      try check(sqlite3_bind_text(statement, 1, key, -1, transient), database)
      let status = sqlite3_step(statement)

      if status == SQLITE_DONE {
        return nil
      }

      try check(status, database, accepted: [SQLITE_ROW])
      guard let value = sqlite3_column_text(statement, 0) else {
        return nil
      }
      return String(cString: value)
    }
  }

  func writeDocument(key: String, value: String) throws {
    try serialized {
      let database = try openDatabase()
      defer { sqlite3_close(database) }
      let sql = "INSERT OR REPLACE INTO documents (key, value) VALUES (?, ?)"
      var statement: OpaquePointer?
      try check(sqlite3_prepare_v2(database, sql, -1, &statement, nil), database)
      defer { sqlite3_finalize(statement) }
      try check(sqlite3_bind_text(statement, 1, key, -1, transient), database)
      try check(sqlite3_bind_text(statement, 2, value, -1, transient), database)
      try check(sqlite3_step(statement), database, accepted: [SQLITE_DONE])
    }
  }

  func deleteDocument(key: String) throws {
    try serialized {
      let database = try openDatabase()
      defer { sqlite3_close(database) }
      let sql = "DELETE FROM documents WHERE key = ?"
      var statement: OpaquePointer?
      try check(sqlite3_prepare_v2(database, sql, -1, &statement, nil), database)
      defer { sqlite3_finalize(statement) }
      try check(sqlite3_bind_text(statement, 1, key, -1, transient), database)
      try check(sqlite3_step(statement), database, accepted: [SQLITE_DONE])
    }
  }

  func deleteSyntheticRecords() throws -> Int {
    let deletedCount = try serialized {
      let database = try openDatabase()
      defer { sqlite3_close(database) }
      let identifiers = try syntheticIdentifiers(database)

      if identifiers.isEmpty {
        return 0
      }

      let sql = "DELETE FROM outbox WHERE id = ?"
      var statement: OpaquePointer?
      try check(sqlite3_prepare_v2(database, sql, -1, &statement, nil), database)
      defer { sqlite3_finalize(statement) }

      for identifier in identifiers {
        try check(sqlite3_reset(statement), database)
        try check(sqlite3_bind_text(statement, 1, identifier, -1, transient), database)
        try check(sqlite3_step(statement), database, accepted: [SQLITE_DONE])
      }

      return identifiers.count
    }
    if deletedCount > 0 {
      SpendingWidgetUpdater.shared.refresh()
    }
    return deletedCount
  }

  func records() throws -> [NormalizedRecord] {
    try serialized {
      let database = try openDatabase()
      defer { sqlite3_close(database) }
      let sql = "SELECT payload FROM outbox ORDER BY captured_at DESC"
      var statement: OpaquePointer?
      try check(sqlite3_prepare_v2(database, sql, -1, &statement, nil), database)
      defer { sqlite3_finalize(statement) }
      var records: [NormalizedRecord] = []

      var status = sqlite3_step(statement)

      while status == SQLITE_ROW {
        let length = Int(sqlite3_column_bytes(statement, 0))
        guard let bytes = sqlite3_column_blob(statement, 0) else {
          status = sqlite3_step(statement)
          continue
        }
        let data = Data(bytes: bytes, count: length)
        records.append(try JSONDecoder().decode(NormalizedRecord.self, from: data))
        status = sqlite3_step(statement)
      }

      try check(status, database, accepted: [SQLITE_DONE])
      return records
    }
  }

  func diagnostics() throws -> [String: String] {
    try serialized {
      let configuration = try IngestionConfiguration.current()
      let database = try openDatabase(configuration: configuration)
      defer { sqlite3_close(database) }
      var values: [String: String] = [
        "cipherVersion": try scalar("PRAGMA cipher_version", database: database),
        "databasePath": configuration.databaseURL.path,
      ]
      values.merge(IngestionAttemptLog(configuration: configuration).snapshot()) { _, new in new }
      return values
    }
  }

  private func syntheticIdentifiers(_ database: OpaquePointer) throws -> [String] {
    let sql = "SELECT id, payload FROM outbox"
    var statement: OpaquePointer?
    try check(sqlite3_prepare_v2(database, sql, -1, &statement, nil), database)
    defer { sqlite3_finalize(statement) }
    var identifiers: [String] = []

    var status = sqlite3_step(statement)

    while status == SQLITE_ROW {
      let length = Int(sqlite3_column_bytes(statement, 1))

      if let identifier = sqlite3_column_text(statement, 0),
        let bytes = sqlite3_column_blob(statement, 1),
        let record = try? JSONDecoder().decode(
          NormalizedRecord.self,
          from: Data(bytes: bytes, count: length)
        ),
        record.merchant == SyntheticSample.merchant,
        record.origin != NormalizedRecordOrigin.manual
      {
        identifiers.append(String(cString: identifier))
      }

      status = sqlite3_step(statement)
    }

    try check(status, database, accepted: [SQLITE_DONE])
    return identifiers
  }

  private func serialized<Result>(_ work: () throws -> Result) throws -> Result {
    try queue.sync {
      let finished = DispatchSemaphore(value: 0)
      ProcessInfo.processInfo.performExpiringActivity(withReason: "Saving encrypted BankStats data") { expired in
        if !expired {
          finished.wait()
        }
      }
      defer { finished.signal() }
      return try work()
    }
  }

  private func openDatabase(configuration: IngestionConfiguration? = nil) throws -> OpaquePointer {
    let configuration = try configuration ?? IngestionConfiguration.current()
    let key = try OutboxKeyStore().loadOrCreate()
    var database: OpaquePointer?
    try check(sqlite3_open(configuration.databaseURL.path, &database), database)
    guard let database else {
      throw IngestionError.database("SQLCipher did not return a database handle")
    }

    do {
      let keyStatus = key.withUnsafeBytes { bytes in
        sqlite3_key(database, bytes.baseAddress, Int32(bytes.count))
      }
      try check(keyStatus, database)
      try check(sqlite3_busy_timeout(database, 5_000), database)
      try execute("PRAGMA cipher_memory_security = ON", database: database)
      try execute("PRAGMA journal_mode = WAL", database: database)
      try execute(
        "CREATE TABLE IF NOT EXISTS outbox (id TEXT PRIMARY KEY, payload BLOB NOT NULL, captured_at TEXT NOT NULL)",
        database: database
      )
      try execute(
        "CREATE TABLE IF NOT EXISTS documents (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
        database: database
      )
      return database
    } catch {
      sqlite3_close(database)
      throw error
    }
  }

  private func execute(_ sql: String, database: OpaquePointer?) throws {
    try check(sqlite3_exec(database, sql, nil, nil, nil), database)
  }

  private func scalar(_ sql: String, database: OpaquePointer?) throws -> String {
    var statement: OpaquePointer?
    try check(sqlite3_prepare_v2(database, sql, -1, &statement, nil), database)
    defer { sqlite3_finalize(statement) }
    try check(sqlite3_step(statement), database, accepted: [SQLITE_ROW])
    guard let value = sqlite3_column_text(statement, 0) else {
      throw IngestionError.database("The query returned no value")
    }
    return String(cString: value)
  }

  private func check(
    _ status: Int32,
    _ database: OpaquePointer?,
    accepted: Set<Int32> = [SQLITE_OK]
  ) throws {
    guard accepted.contains(status) else {
      let message = database.map { String(cString: sqlite3_errmsg($0)) } ?? "SQLite status \(status)"
      throw IngestionError.database(message)
    }
  }
}
