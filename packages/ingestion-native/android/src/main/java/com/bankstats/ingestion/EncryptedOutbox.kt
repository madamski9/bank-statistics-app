package com.bankstats.ingestion

import android.content.Context
import android.database.Cursor
import net.zetetic.database.sqlcipher.SQLiteConnection
import net.zetetic.database.sqlcipher.SQLiteDatabase
import net.zetetic.database.sqlcipher.SQLiteDatabaseHook
import java.util.Date

class EncryptedOutbox(
  context: Context,
  private val configuration: IngestionConfiguration = IngestionConfiguration.current(context)
) {
  private val context = context.applicationContext
  private val lock = Any()
  private var database: SQLiteDatabase? = null

  fun ingest(title: String = "", subtitle: String, body: String, sourceApp: String): NormalizationOutcome {
    val outcome = BundledBankNotificationRules.interpreter(context).normalize(
      title = title,
      subtitle = subtitle,
      body = body,
      sourceApp = sourceApp,
      capturedAt = Date()
    )

    if (outcome is NormalizationOutcome.Record) {
      persist(outcome.record)
    }

    return outcome
  }

  fun save(record: NormalizedRecord) {
    persist(record)
  }

  fun delete(id: String): Int = withDatabase { database ->
    database.delete("outbox", "id = ?", arrayOf<Any>(id))
  }

  fun clear() {
    withDatabase { database ->
      database.inTransaction {
        database.execSQL("DELETE FROM outbox")
        database.execSQL("DELETE FROM documents")
      }
      IngestionAttemptLog(context, configuration).reset()
    }
  }

  fun readDocument(key: String): String? = withDatabase { database ->
    database.rawQuery("SELECT value FROM documents WHERE key = ?", arrayOf(key)).use { cursor ->
      if (cursor.moveToFirst()) cursor.getString(0) else null
    }
  }

  fun writeDocument(key: String, value: String) {
    withDatabase { database ->
      database.execSQL("INSERT OR REPLACE INTO documents (key, value) VALUES (?, ?)", arrayOf<Any>(key, value))
    }
  }

  fun deleteDocument(key: String) {
    withDatabase { database ->
      database.delete("documents", "key = ?", arrayOf<Any>(key))
    }
  }

  fun deleteSyntheticRecords(): Int = withDatabase { database ->
    val identifiers = database.rawQuery("SELECT id, payload FROM outbox", emptyArray<String>()).use { cursor ->
      cursor.rows()
        .mapNotNull { row ->
          val record = runCatching { NormalizedRecord.fromJson(String(row.getBlob(1), Charsets.UTF_8)) }.getOrNull()
          row.getString(0).takeIf {
            record?.merchant == SyntheticSample.MERCHANT && record.origin != NormalizedRecordOrigin.MANUAL
          }
        }
        .toList()
    }

    if (identifiers.isNotEmpty()) {
      database.inTransaction {
        identifiers.forEach { database.delete("outbox", "id = ?", arrayOf<Any>(it)) }
      }
    }

    identifiers.size
  }

  fun records(): List<NormalizedRecord> = withDatabase { database ->
    database.rawQuery("SELECT payload FROM outbox ORDER BY captured_at DESC", emptyArray<String>()).use { cursor ->
      cursor.rows()
        .mapNotNull { row -> row.getBlob(0)?.let { NormalizedRecord.fromJson(String(it, Charsets.UTF_8)) } }
        .toList()
    }
  }

  fun diagnostics(): Map<String, String> = withDatabase { database ->
    val cipherVersion = database.rawQuery("PRAGMA cipher_version", emptyArray<String>()).use { cursor ->
      if (cursor.moveToFirst()) cursor.getString(0) else null
    } ?: throw IngestionException.Database("The query returned no value")

    mapOf(
      "cipherVersion" to cipherVersion,
      "databasePath" to configuration.databaseFile.absolutePath
    ) + IngestionAttemptLog(context, configuration).snapshot()
  }

  fun close() {
    synchronized(lock) {
      database?.close()
      database = null
    }
  }

  private fun persist(record: NormalizedRecord) {
    withDatabase { database ->
      database.execSQL(
        "INSERT OR REPLACE INTO outbox (id, payload, captured_at) VALUES (?, ?, ?)",
        arrayOf<Any>(record.id, record.toJson().toByteArray(Charsets.UTF_8), record.capturedAt)
      )
    }
  }

  private fun <T> withDatabase(operation: (SQLiteDatabase) -> T): T =
    synchronized(lock) {
      try {
        operation(database ?: open().also { database = it })
      } catch (error: IngestionException) {
        throw error
      } catch (error: Exception) {
        throw IngestionException.Database(error.message ?: error.javaClass.simpleName, error)
      }
    }

  private fun open(): SQLiteDatabase {
    loadNativeLibrary()
    val key = OutboxKeyStore(configuration.keyFile, configuration.keyAlias).loadOrCreate()
    configuration.databaseFile.parentFile?.mkdirs()
    val opened = SQLiteDatabase.openOrCreateDatabase(configuration.databaseFile, key, null, null, MemorySecurityHook)

    try {
      opened.enableWriteAheadLogging()
      opened.execSQL(
        "CREATE TABLE IF NOT EXISTS outbox (id TEXT PRIMARY KEY, payload BLOB NOT NULL, captured_at TEXT NOT NULL)"
      )
      opened.execSQL("CREATE TABLE IF NOT EXISTS documents (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
      return opened
    } catch (error: Exception) {
      opened.close()
      throw error
    }
  }

  private object MemorySecurityHook : SQLiteDatabaseHook {
    override fun preKey(connection: SQLiteConnection) = Unit

    override fun postKey(connection: SQLiteConnection) {
      connection.executeRaw("PRAGMA cipher_memory_security = ON", null, null)
    }
  }

  private fun <T> SQLiteDatabase.inTransaction(block: () -> T): T {
    beginTransaction()
    try {
      return block().also { setTransactionSuccessful() }
    } finally {
      endTransaction()
    }
  }

  private fun Cursor.rows(): Sequence<Cursor> = generateSequence { if (moveToNext()) this else null }

  companion object {
    @Volatile
    private var shared: EncryptedOutbox? = null

    @Volatile
    private var nativeLibraryLoaded = false

    fun shared(context: Context): EncryptedOutbox {
      shared?.let { return it }

      return synchronized(this) {
        shared ?: EncryptedOutbox(context).also { shared = it }
      }
    }

    private fun loadNativeLibrary() {
      if (nativeLibraryLoaded) {
        return
      }

      synchronized(this) {
        if (!nativeLibraryLoaded) {
          System.loadLibrary("sqlcipher")
          nativeLibraryLoaded = true
        }
      }
    }
  }
}
