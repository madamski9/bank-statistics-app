import Foundation
import SQLCipher

enum IngestionError: Error {
  case database(String)
  case notificationUnavailable
  case invalidRecord

  var reasonCode: String { "database" }
}

struct IngestionConfiguration {
  let appGroupIdentifier: String
  let databaseURL: URL

  static func current() throws -> IngestionConfiguration {
    IngestionConfiguration(
      appGroupIdentifier: "com.bankstats.inbox.conformance.\(ProcessInfo.processInfo.processIdentifier)",
      databaseURL: URL(fileURLWithPath: CommandLine.arguments[3] + "/capture.sqlite")
    )
  }
}

struct OutboxKeyStore {
  func loadOrCreate() throws -> Data { Data(repeating: 7, count: 32) }
}

final class SpendingWidgetUpdater: Sendable {
  static let shared = SpendingWidgetUpdater()

  func refresh(capturedRecordId: String? = nil) {}
}

extension BankNotificationInterpreter {
  static func bundled() throws -> BankNotificationInterpreter {
    let data = try Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))
    return try BankNotificationInterpreter(bundle: JSONDecoder().decode(BankNotificationRuleBundle.self, from: data))
  }
}

struct AdmissionCase {
  let title: String
  let subtitle: String
  let body: String
  let accepted: Bool

  init(_ body: String, title: String = "", subtitle: String = "", accepted: Bool = true) {
    self.title = title
    self.subtitle = subtitle
    self.body = body
    self.accepted = accepted
  }
}

let cases = [
  AdmissionCase("Obciążenie rachunku: 12,34 PLN"),
  AdmissionCase("Wpływ: PLN 1 234,56"),
  AdmissionCase("Zapłacono 1\u{00a0}234,56 zł"),
  AdmissionCase("Zwrot: 1\u{202f}234,56 EUR"),
  AdmissionCase("Paid $12.34"),
  AdmissionCase("Paid £ 12.34"),
  AdmissionCase("Paid 1,234.56 USD"),
  AdmissionCase("Paid 1.234,56 EUR"),
  AdmissionCase("Paid −12,34 PLN"),
  AdmissionCase("Paid CHF 12.34"),
  AdmissionCase("Refund EUR -12,34"),
  AdmissionCase("Refund $−12.34"),
  AdmissionCase("Paid 150 JPY"),
  AdmissionCase("Paid 100 CZK"),
  AdmissionCase("Paid 100 AED"),
  AdmissionCase("Paid 100 zł."),
  AdmissionCase("12,34", subtitle: "Sklep"),
  AdmissionCase("100", subtitle: "Sklep"),
  AdmissionCase("12,34 PLN", title: "Bank Millennium S.A.", subtitle: "Promocja Sklep"),
  AdmissionCase("12,34 PLN w PROMOCJA SKLEP", title: "Nowa operacja kartą"),
  AdmissionCase("123456 to kod logowania", accepted: false),
  AdmissionCase("Masz 100 punktów", accepted: false),
  AdmissionCase("Masz 100 dni", accepted: false),
  AdmissionCase("100 LAT", accepted: false),
  AdmissionCase("12,34", accepted: false),
  AdmissionCase("12,34 PLNx", accepted: false),
  AdmissionCase("ABC12,34 PLN", accepted: false),
  AdmissionCase("1,2345 PLN", accepted: false),
  AdmissionCase("Odbierz 200 zł premii za założenie konta", accepted: false),
  AdmissionCase("Zyskaj nawet 1000 PLN", accepted: false),
  AdmissionCase("Skorzystaj z pożyczki do 50 000 PLN", accepted: false),
  AdmissionCase("Oferta specjalna: 100 PLN premii", accepted: false),
  AdmissionCase("Zapłać 100 zł i odbierz 20 zł.", title: "Promocja", accepted: false),
  AdmissionCase("Zapłać 100 zł. Odbierz 20 zł premii!", accepted: false),
  AdmissionCase("Weź kredyt do 50000 PLN", accepted: false),
  AdmissionCase("Sprawdź ofertę i odbierz 100 zł", accepted: false),
  AdmissionCase("Get up to 100 EUR", accepted: false),
  AdmissionCase("Masz do odebrania 200 zł", accepted: false),
  AdmissionCase("Mamy dla Ciebie 100 PLN premii", accepted: false),
  AdmissionCase("100 PLN premii za otwarcie konta", accepted: false),
  AdmissionCase("Oceń naszą aplikację", accepted: false),
]

var checks = 0

func check(_ condition: Bool, _ message: String) {
  checks += 1
  if !condition {
    fatalError(message)
  }
}

for test in cases {
  check(
    NotificationAdmission.accepts(title: test.title, subtitle: test.subtitle, body: test.body) == test.accepted,
    "Admission failed: \(test.title) / \(test.subtitle) / \(test.body)"
  )
}

check(NotificationAmount.minorUnits(String(Int.max)) == nil, "Oversized amounts must not crash capture or replay")
check(NotificationAmount.minorUnits("92233720368547758,08") == nil, "Minor-unit addition must not overflow")
check(NotificationAmount.minorUnits("92233720368547758,07") == Int.max, "Largest valid minor-unit amount must remain readable")

let rulesData = try Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))
let bundle = try JSONDecoder().decode(BankNotificationRuleBundle.self, from: rulesData)
let interpreter = try BankNotificationInterpreter(bundle: bundle)
let examplesData = try Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[2]))
let examples = try JSONSerialization.jsonObject(with: examplesData) as! [String: Any]
for example in examples["examples"] as! [[String: Any]] {
  let expected = example["expected"] as! [String: Any]
  if expected["outcome"] as? String == "record" {
    let input = example["input"] as! [String: String]
    check(
      NotificationAdmission.accepts(title: input["title"]!, subtitle: input["subtitle"]!, body: input["body"]!),
      "Admission rejected existing transaction: \(example["name"]!)"
    )
  }
}

let path = CommandLine.arguments[3] + "/inbox.sqlite"
let key = String(repeating: "a", count: 64)

func execute(_ database: OpaquePointer, _ sql: String) throws {
  guard sqlite3_exec(database, sql, nil, nil, nil) == SQLITE_OK else {
    throw IngestionError.database(String(cString: sqlite3_errmsg(database)))
  }
}

func open() throws -> OpaquePointer {
  var handle: OpaquePointer?
  check(sqlite3_open(path, &handle) == SQLITE_OK, "Database must open")
  let database = handle!
  try execute(database, "PRAGMA key = \"x'\(key)'\"")
  try execute(database, "PRAGMA journal_mode = WAL")
  try execute(database, "PRAGMA synchronous = FULL")
  try execute(database, "PRAGMA secure_delete = ON")
  try NotificationInbox(database: database).prepare()
  try execute(database, "CREATE TABLE IF NOT EXISTS normalized (id TEXT PRIMARY KEY, captured_at TEXT)")
  return database
}

func count(_ database: OpaquePointer, _ table: String) -> Int {
  var statement: OpaquePointer?
  check(sqlite3_prepare_v2(database, "SELECT COUNT(*) FROM \(table)", -1, &statement, nil) == SQLITE_OK, "Count must prepare")
  defer { sqlite3_finalize(statement) }
  check(sqlite3_step(statement) == SQLITE_ROW, "Count must return a row")
  return Int(sqlite3_column_int(statement, 0))
}

var database = try open()
var inbox = NotificationInbox(database: database)
let capturedAt = ISO8601DateFormatter().date(from: "2026-10-20T12:00:00Z")!
let notification = CapturedNotification(
  title: "Nowa operacja kartą",
  subtitle: "",
  body: "26,70 PLN w AUTOPAY MOBILITY WARSZAWA",
  sourceApp: "pl.mbank",
  capturedAt: capturedAt
)
try inbox.enqueue(notification)
check(count(database, "notification_inbox") == 1, "Raw notification must be saved before any parsing")
check(count(database, "normalized") == 0, "Enqueue must not parse")
check(sqlite3_close(database) == SQLITE_OK, "Database must close")
database = try open()
inbox = NotificationInbox(database: database)
check(try inbox.pending(rulesVersion: bundle.version) == [notification], "Raw payload must survive closing and reopening")

var oldRules = try JSONSerialization.jsonObject(with: rulesData) as! [String: Any]
oldRules["rules"] = []
oldRules["version"] = bundle.version - 1
let oldBundle = try JSONDecoder().decode(BankNotificationRuleBundle.self, from: JSONSerialization.data(withJSONObject: oldRules))
let oldInterpreter = try BankNotificationInterpreter(bundle: oldBundle)
let pending = try inbox.process(notification, interpreter: oldInterpreter) { _ in
  fatalError("Unknown formats must never create transactions")
}
if case .pending(let reason) = pending {
  check(reason == "unsupportedNotification", "Unknown format must be visible as awaiting recognition")
} else {
  fatalError("Unknown format must stay pending")
}
check(try inbox.pending(rulesVersion: oldBundle.version).isEmpty, "Unknown format must wait for changed rules")
check(try inbox.pending(rulesVersion: bundle.version) == [notification], "Changed rules must retry pending notification")

func save(_ record: NormalizedRecord) throws -> NormalizedRecord? {
  try execute(database, "INSERT INTO normalized VALUES ('\(record.id)', '\(record.capturedAt)')")
  return record
}

do {
  _ = try inbox.process(notification, interpreter: interpreter) { record in
    _ = try save(record)
    throw IngestionError.database("Simulated interruption after normalized insert")
  }
  fatalError("Failed persistence must throw")
} catch {
  check(count(database, "notification_inbox") == 1, "Failed transaction must preserve the raw notification")
  check(count(database, "normalized") == 0, "Failed transaction must roll back normalized insert")
}

check(sqlite3_close(database) == SQLITE_OK, "Database must close after failure")
database = try open()
inbox = NotificationInbox(database: database)
let recovered = try inbox.pending(rulesVersion: bundle.version)
check(recovered == [notification], "Failed processing must remain retryable after restart")
let result = try inbox.process(recovered[0], interpreter: interpreter, save: save)
if case .record(let record) = result {
  check(record.id == notification.id, "Recovery must use stable notification identity")
  check(record.capturedAt == "2026-10-20T12:00:00Z", "Recovery must preserve capture time")
  check(record.occurredAt == record.capturedAt, "Recovery must not shift occurrence to the retry date")
} else {
  fatalError("Recovered notification must create a transaction")
}
check(count(database, "notification_inbox") == 0, "Successful recognition must delete raw text")
check(count(database, "normalized") == 1, "Recovery must create exactly one record")
_ = try inbox.process(notification, interpreter: interpreter) { _ in
  fatalError("Stale concurrent retry must not save again")
}
check(count(database, "normalized") == 1, "Stale concurrent retry must not duplicate transactions")

let paired = CapturedNotification(title: notification.title, subtitle: "", body: notification.body, sourceApp: "pl.mbank")
try inbox.enqueue(paired)
_ = try inbox.process(paired, interpreter: interpreter) { _ in nil }
check(count(database, "notification_inbox") == 0, "Already paired payment must release its raw text atomically")

let expiry = CapturedNotification(title: "", subtitle: "", body: "Nierozpoznana operacja 19,99 PLN", sourceApp: "bank", capturedAt: capturedAt)
try inbox.enqueue(expiry)
try inbox.expire(at: capturedAt.addingTimeInterval(NotificationInbox.retention - 1))
check(count(database, "notification_inbox") == 1, "Uncertain notification must remain before expiry")
try inbox.expire(at: capturedAt.addingTimeInterval(NotificationInbox.retention))
check(count(database, "notification_inbox") == 0, "Raw text must expire at 30 days")
try inbox.enqueue(expiry)
check(sqlite3_close(database) == SQLITE_OK, "Database must close before encryption check")
let encrypted = try Data(contentsOf: URL(fileURLWithPath: path))
for marker in [expiry.body, notification.body, "SQLite format 3", "notification_inbox"] {
  check(encrypted.range(of: Data(marker.utf8)) == nil, "Database must not expose plaintext: \(marker)")
}
database = try open()
inbox = NotificationInbox(database: database)
try inbox.clear()
check(count(database, "notification_inbox") == 0, "Clearing local data must remove raw text")
check(sqlite3_close(database) == SQLITE_OK, "Database must close at the end")
let outbox = EncryptedOutbox.shared
let configuration = try IngestionConfiguration.current()

func captureDatabase() throws -> OpaquePointer {
  var handle: OpaquePointer?
  check(sqlite3_open(configuration.databaseURL.path, &handle) == SQLITE_OK, "Capture database must open")
  let database = handle!
  let key = try OutboxKeyStore().loadOrCreate()
  check(key.withUnsafeBytes { sqlite3_key(database, $0.baseAddress, Int32($0.count)) } == SQLITE_OK, "Capture database must unlock")
  return database
}

func captureCount(_ table: String) throws -> Int {
  let database = try captureDatabase()
  defer { sqlite3_close(database) }
  return count(database, table)
}

func capture(_ body: String, title: String = "", subtitle: String = "") throws -> NotificationIngestionOutcome {
  try outbox.ingest(title: title, subtitle: subtitle, body: body, sourceApp: "pl.mbank")
}

try outbox.clear()
_ = try capture("Odbierz 200 zł premii za założenie konta")
_ = try capture("Twój kod logowania: 123456")
check(try captureCount("notification_inbox") == 0, "Rejected notifications must never be persisted by capture")
check(try outbox.records().isEmpty, "Rejected notifications must never become transactions")

let unknown = try capture("Nowy format operacji: 19,99 PLN")
if case .pending(let reason) = unknown {
  check(reason == "unsupportedNotification", "Unknown monetary capture must await recognition")
} else {
  fatalError("Unknown monetary capture must remain durable")
}
check(try outbox.diagnostics()["pendingNotificationCount"] == "1", "Diagnostics must expose pending count without raw text")
check(try outbox.records().isEmpty, "Pending notification must not affect statistics")
check(try captureCount("notification_inbox") == 1, "Reading records must preserve unknown monetary notifications")

let queued = try NotificationCapture.capture(title: "", subtitle: "", body: "Nieznana operacja 20 PLN", sourceApp: "pl.mbank")
if case .queued = queued {
  check(try outbox.diagnostics()["lastAttemptOutcome"] == "pending", "Durable raw capture must not claim a transaction was saved")
} else {
  fatalError("Shortcut must acknowledge durable pending capture")
}
try outbox.clear()

let captureHandle = try captureDatabase()
try execute(captureHandle, "CREATE TRIGGER fail_capture BEFORE INSERT ON outbox BEGIN SELECT RAISE(ABORT, 'simulated write failure'); END")
check(sqlite3_close(captureHandle) == SQLITE_OK, "Trigger setup must close")
let interrupted = try capture(notification.body, title: notification.title)
if case .pending(let reason) = interrupted {
  check(reason == "database", "Capture must acknowledge saved raw payload after normalized write fails")
} else {
  fatalError("Failed normalization persistence must keep capture pending")
}
check(try captureCount("notification_inbox") == 1, "Production capture must retain raw text after normalized write failure")
check(try captureCount("outbox") == 0, "Production capture must roll back failed normalized write")
let retryHandle = try captureDatabase()
try execute(retryHandle, "DROP TRIGGER fail_capture")
check(sqlite3_close(retryHandle) == SQLITE_OK, "Trigger cleanup must close")
let restored = try outbox.records()
check(restored.count == 1, "Next record read must recover interrupted capture")
check(try captureCount("notification_inbox") == 0, "Recovered capture must release raw text")
check(try outbox.records().count == 1, "Further record reads must not duplicate recovered capture")

_ = try capture("26,70 PLN", title: "mBank", subtitle: "Autopay Mobility")
let pairedRecords = try outbox.records()
check(pairedRecords.count == 1, "Production capture must preserve Wallet and bank pairing")
check(pairedRecords[0].id == restored[0].id, "Wallet enrichment must retain the recovered identifier")
check(pairedRecords[0].merchant == "Autopay Mobility", "Wallet enrichment must update the recovered merchant")
check(try captureCount("notification_inbox") == 0, "Paired capture must release its raw payload")

let awaiting = try capture("Płatność kartą debetową: Kwota: 12,34 PLN")
if case .ignored(let reason) = awaiting {
  check(reason == IgnoredReason.cardPaymentAwaitingApplePay, "Known Wallet deferral must keep its existing outcome")
} else {
  fatalError("Known Wallet deferral must not claim an unrecognized format")
}
check(try captureCount("notification_inbox") == 1, "Known Wallet deferral must retain raw text for future rules")
check(try outbox.diagnostics()["pendingNotificationCount"] == "0", "Expected Wallet deferral must not create a recognition warning")

try outbox.writeDocument(key: "test", value: "test")
_ = try capture("Nieznana operacja 30 PLN")
try outbox.clear()
check(try captureCount("notification_inbox") == 0, "Clearing local data must clear production raw inbox")
check(try outbox.records().isEmpty, "Clearing local data must clear normalized transactions")
check(try outbox.readDocument(key: "test") == nil, "Clearing local data must still clear documents")
database = try open()
inbox = NotificationInbox(database: database)
try execute(database, "DROP TABLE notification_inbox")
try execute(database, "CREATE TABLE notification_inbox (id TEXT PRIMARY KEY, payload BLOB NOT NULL, captured_at REAL NOT NULL, rules_version INTEGER, requires_recognition INTEGER NOT NULL DEFAULT 1)")
try inbox.enqueue(notification)
try inbox.prepare()
check(try inbox.notification(id: notification.id) == notification, "Migration must preserve queued raw payloads")
check(try inbox.diagnostics(offset: 0).count == 1, "Migration must make legacy entries visible")
try inbox.prepare()
check(try inbox.diagnostics(offset: 0).count == 1, "Repeated migration must be harmless")
try inbox.clear()
let invalidDate = CapturedNotification(
  title: "", subtitle: "",
  body: "Otrzymano przelew na numer telefonu Data: 2026-03-29 02:30 Kwota: 30,00 PLN",
  sourceApp: "pl.pkobp.iko"
)
try inbox.enqueue(invalidDate)
_ = try inbox.process(invalidDate, interpreter: interpreter) { _ in fatalError("Invalid date must not save") }
let invalidEntries = try inbox.diagnostics(offset: 0)
check(invalidEntries.count == 1, "Rejected notification must be available in diagnostics")
check(invalidEntries[0]["body"] as? String == invalidDate.body, "Diagnostics must preserve the whole original body")
let traceData = Data((invalidEntries[0]["diagnosticJson"] as! String).utf8)
let diagnostic = try JSONSerialization.jsonObject(with: traceData) as! [String: Any]
let parsed = diagnostic["parser"] as! [String: Any]
let attempts = parsed["attempts"] as! [[String: Any]]
check(attempts.contains { $0["reasonCode"] as? String == "invalidOccurrenceDate" }, "Trace must identify date validation failure")
let pkoAttempt = attempts.first { $0["ruleId"] as? String == "pko.transfer" }!
check((pkoAttempt["groups"] as! [String: String])["amount"] == "30,00", "Trace must retain partially extracted fields")
check(parsed["record"] == nil, "A rejected parse must not invent a transaction JSON")
try inbox.clear()
check(sqlite3_close(database) == SQLITE_OK, "Diagnostic test database must close")

let _ = try capture("Nieznana operacja 40 PLN")
let pendingEntries = try outbox.notificationDiagnostics(offset: 0)
check(pendingEntries.count == 1, "Production diagnostics must list unknown monetary notifications")
let restoreId = pendingEntries[0]["id"] as! String
let restoreSource = try captureDatabase()
try execute(restoreSource, "CREATE TRIGGER fail_restore BEFORE INSERT ON outbox BEGIN SELECT RAISE(ABORT, 'simulated restore failure'); END")
check(sqlite3_close(restoreSource) == SQLITE_OK, "Restore failure trigger must close")
let templateRecord = cardForRecovery()

do {
  _ = try outbox.restoreNotification(id: restoreId) { _ in templateRecord }
  fatalError("Manual restore must surface storage failure")
} catch {
  check(try captureCount("notification_inbox") == 1, "Failed manual restore must preserve the original")
  check(try captureCount("outbox") == 0, "Failed manual restore must not leave a partial transaction")
}
let restoreRetry = try captureDatabase()
try execute(restoreRetry, "DROP TRIGGER fail_restore")
check(sqlite3_close(restoreRetry) == SQLITE_OK, "Restore trigger cleanup must close")
let manuallyRestored = try outbox.restoreNotification(id: restoreId) { _ in templateRecord }
check(manuallyRestored.id == restoreId, "Manual restore must reuse the inbox identifier")
check(try captureCount("notification_inbox") == 0, "Manual restore must remove raw text atomically")
check(try outbox.records().count == 1, "Manual restore must create one transaction")
do {
  _ = try outbox.restoreNotification(id: restoreId) { _ in templateRecord }
  fatalError("A stale second restore must not insert again")
} catch {
  check(try outbox.records().count == 1, "Repeated manual restore must not duplicate the transaction")
}
try outbox.clear()

_ = try capture(notification.body, title: notification.title)
let persistenceFailure = try captureDatabase()
try execute(persistenceFailure, "CREATE TRIGGER fail_diagnostic BEFORE INSERT ON outbox BEGIN SELECT RAISE(ABORT, 'simulated failure'); END")
check(sqlite3_close(persistenceFailure) == SQLITE_OK, "Failure setup must close")
_ = try capture("15,25 PLN do OSOBA TESTOWA", title: "Przelew z konta")
let failedEntries = try outbox.notificationDiagnostics(offset: 0)
let failureJson = try JSONSerialization.jsonObject(with: Data((failedEntries[0]["diagnosticJson"] as! String).utf8)) as! [String: Any]
check(failureJson["failureReason"] as? String == "database", "Storage failure must survive rollback in diagnostic snapshot")
let failedParser = failureJson["parser"] as! [String: Any]
check((failedParser["record"] as! [String: Any])["amountMinor"] as? Int == 1525, "Snapshot must retain the transaction JSON that failed to persist")
let failureCleanup = try captureDatabase()
try execute(failureCleanup, "DROP TRIGGER fail_diagnostic")
check(sqlite3_close(failureCleanup) == SQLITE_OK, "Failure cleanup must close")
let retryResult = try outbox.retryNotification(id: failedEntries[0]["id"] as! String)
if case .record = retryResult {
  check(try outbox.notificationDiagnostics(offset: 0).isEmpty, "Manual retry must release recovered diagnostic snapshot")
} else { fatalError("Retry must recover the saved transaction JSON") }
try outbox.clear()

for index in 0..<51 {
  _ = try capture("Nieznana operacja \(index + 1) PLN")
}
check(try outbox.notificationDiagnostics(offset: 0).count == 50, "Inbox must bound its first page")
check(try outbox.notificationDiagnostics(offset: 50).count == 1, "Inbox must expose remaining entries on the next page")
try outbox.clear()
func wallet(_ title: String, sourceApp: String = "com.apple.Passbook") throws -> NormalizedRecord {
  let result = try outbox.ingest(title: title, subtitle: "SKLEP TESTOWY", body: "19,99 PLN", sourceApp: sourceApp)
  guard case .record(let record) = result else { fatalError("Wallet capture must create a transaction") }
  return record
}

let tradeRepublic = try wallet("Trade Republic")
let secondTradeRepublic = try wallet("Trade Republic")
let otherBank = try wallet("Inny Bank")
let otherApp = try wallet("Trade Republic", sourceApp: "other.wallet")
let supportedBank = try wallet("mBank")
check(tradeRepublic.bank == "unknown", "Generic Wallet recognition must keep the bank unassigned")
check(tradeRepublic.notificationTitle == "Trade Republic", "Successful capture must retain the original notification title")
check(tradeRepublic.bankName == nil, "A notification title must not silently become a confirmed bank name")
check(try captureCount("notification_inbox") == 0, "Successful capture must still release the full raw notification")
var namedTradeRepublic = tradeRepublic
namedTradeRepublic.bankName = "  Trade Republic Bank  "
let named = try outbox.saveAndRememberBank(namedTradeRepublic)
check(named.bankName == "Trade Republic Bank", "User-entered bank names must be trimmed")
check(named.id == tradeRepublic.id && named.amountMinor == tradeRepublic.amountMinor, "Assigning a bank must preserve transaction facts")
let assigned = try outbox.records()
check(assigned.first { $0.id == secondTradeRepublic.id }?.bankName == "Trade Republic Bank", "Learning must also label previous transactions from the same source")
check(assigned.first { $0.id == otherBank.id }?.bankName == nil, "Another bank in the same Wallet must remain unassigned")
check(assigned.first { $0.id == otherApp.id }?.bankName == nil, "An identical title from a different app must remain unassigned")
check(assigned.first { $0.id == supportedBank.id }?.bankName == nil, "Learning must leave supported bank recognition unchanged")
check(try captureCount("notification_banks") == 1, "The mapping must persist in the encrypted database")
check(try wallet("  TRADE   REPUBLIC  ").bankName == "Trade Republic Bank", "Future capture must learn despite casing and whitespace differences")
check(try wallet("Trade Republic Premium").bankName == nil, "Learning must use the full title rather than substring matching")
var remoteUpdate = named
remoteUpdate.notificationTitle = nil
remoteUpdate.category = "groceries"
try outbox.save(remoteUpdate)
check(try outbox.records().first { $0.id == named.id }?.notificationTitle == "Trade Republic", "Cloud updates without the private title must preserve its local value")
check(try outbox.records().first { $0.id == named.id }?.category == "groceries", "Keeping the title must not discard a remote update")

let renameFailure = try captureDatabase()
try execute(renameFailure, "CREATE TRIGGER fail_bank_name BEFORE INSERT ON outbox BEGIN SELECT RAISE(ABORT, 'simulated bank rename failure'); END")
check(sqlite3_close(renameFailure) == SQLITE_OK, "Bank rename failure setup must close")
var renamed = named
renamed.bankName = "Nowa nazwa"
do {
  _ = try outbox.saveAndRememberBank(renamed)
  fatalError("Bank assignment failure must surface")
} catch {
  check(try outbox.records().first { $0.id == named.id }?.bankName == "Trade Republic Bank", "Failed renaming must roll back the transaction")
}
let renameCleanup = try captureDatabase()
try execute(renameCleanup, "DROP TRIGGER fail_bank_name")
check(sqlite3_close(renameCleanup) == SQLITE_OK, "Bank rename failure cleanup must close")
check(try wallet("Trade Republic").bankName == "Trade Republic Bank", "Failed renaming must roll back the learned rule too")
let renamedRecord = try outbox.saveAndRememberBank(renamed)
check(renamedRecord.bankName == "Nowa nazwa", "The user must be able to correct a learned bank name")
check(try outbox.records().first { $0.id == secondTradeRepublic.id }?.bankName == "Nowa nazwa", "Correcting a bank must update earlier matching transactions")
check(try wallet("Trade Republic").bankName == "Nowa nazwa", "Corrected bank names must apply to future captures")
let emptyTitle = try wallet("")
var invalidAssignment = emptyTitle
invalidAssignment.bankName = "Nie przypisuj do całego Wallet"
do {
  _ = try outbox.saveAndRememberBank(invalidAssignment)
  fatalError("An empty notification title must never train a Wallet-wide bank rule")
} catch {
  check(try captureCount("notification_banks") == 1, "Invalid assignment must not add a mapping")
}
var tooLongName = named
tooLongName.bankName = String(repeating: "a", count: 61)
do {
  _ = try outbox.saveAndRememberBank(tooLongName)
  fatalError("Oversized bank names must fail")
} catch {
  check(try captureCount("notification_banks") == 1, "Invalid bank name must not change mappings")
}
try outbox.clear()
check(try captureCount("notification_banks") == 0, "Clearing local data must clear bank mappings")
check(try wallet("Trade Republic").bankName == nil, "Cleared mappings must no longer label captures")
try outbox.clear()
print("\(checks) notification admission and encrypted inbox checks pass")

func cardForRecovery() -> NormalizedRecord {
  NormalizedRecord(
    id: "untrusted-draft-id", bank: "manual", direction: "expense", transactionType: nil,
    amountMinor: 4000, currency: "PLN", merchant: "SKLEP", accountName: nil,
    occurredAt: "2026-10-20T12:00:00Z", capturedAt: "2026-10-20T12:00:00Z",
    sourceApp: "manual", status: "posted", origin: "manual"
  )
}
