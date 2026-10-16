package com.bankstats.ingestion

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import net.zetetic.database.sqlcipher.SQLiteDatabase
import org.junit.After
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.security.KeyStore
import java.util.UUID

@RunWith(AndroidJUnit4::class)
class EncryptedOutboxTest {
  private val context = InstrumentationRegistry.getInstrumentation().targetContext
  private lateinit var directory: File
  private lateinit var configuration: IngestionConfiguration
  private val outboxes = mutableListOf<EncryptedOutbox>()

  @Before
  fun setUp() {
    val name = "outbox-test-${UUID.randomUUID()}"
    directory = File(context.noBackupFilesDir, name).apply { mkdirs() }
    configuration = IngestionConfiguration(
      databaseFile = File(directory, "bankstats-outbox.sqlite"),
      keyFile = File(directory, "bankstats-outbox.key"),
      keyAlias = "com.bankstats.ingestion.test.$name",
      attemptLogName = "com.bankstats.ingestion.test.$name"
    )
  }

  @After
  fun tearDown() {
    outboxes.forEach { it.close() }
    directory.deleteRecursively()
    KeyStore.getInstance("AndroidKeyStore").apply { load(null) }.deleteEntry(configuration.keyAlias)
    context.deleteSharedPreferences(configuration.attemptLogName)
  }

  @Test
  fun recordsAndDocumentsSurviveARestart() {
    val first = outbox()
    val record = manualRecord(merchant = "Piekarnia Restart")
    first.save(record)
    first.writeDocument("accounts", "{\"name\":\"Konto Restart\"}")
    first.close()

    val second = outbox()

    assertEquals(listOf(record), second.records())
    assertEquals("{\"name\":\"Konto Restart\"}", second.readDocument("accounts"))
  }

  @Test
  fun theDatabaseKeyIsStableAndOnlyStoredWrapped() {
    val keyStore = OutboxKeyStore(configuration.keyFile, configuration.keyAlias)
    val key = keyStore.loadOrCreate()
    val again = OutboxKeyStore(configuration.keyFile, configuration.keyAlias).loadOrCreate()

    assertEquals(32, key.size)
    assertArrayEquals(key, again)
    assertFalse(configuration.keyFile.readBytes().contains(key))
  }

  @Test
  fun nothingIsWrittenToDiskInPlaintext() {
    val outbox = outbox()
    outbox.save(manualRecord(merchant = "Kawiarnia Jawna"))
    outbox.writeDocument("ledger", "Dokument Jawny")

    assertNoPlaintext("while the database is open")
    outbox.close()
    assertNoPlaintext("after the database is closed")
  }

  @Test
  fun theDatabaseCannotBeOpenedWithAnotherKey() {
    val outbox = outbox()
    outbox.save(manualRecord(merchant = "Sklep Klucz"))
    outbox.close()
    System.loadLibrary("sqlcipher")

    try {
      SQLiteDatabase.openOrCreateDatabase(configuration.databaseFile, ByteArray(32) { 7 }, null, null, null).use {
        it.rawQuery("SELECT count(*) FROM outbox", emptyArray<String>()).use { cursor -> cursor.moveToFirst() }
      }
      fail("The outbox opened with a key that is not its own")
    } catch (expected: Exception) {
      assertTrue(expected.message.orEmpty(), expected.message.orEmpty().contains("not a database"))
    }
  }

  @Test
  fun recordsAreListedNewestFirstAndReplacedByIdentifier() {
    val outbox = outbox()
    val older = manualRecord(merchant = "Starszy", capturedAt = "2026-10-01T10:00:00Z")
    val newer = manualRecord(merchant = "Nowszy", capturedAt = "2026-10-02T10:00:00Z")
    outbox.save(older)
    outbox.save(newer)
    val corrected = older.copy(category = "groceries")
    outbox.save(corrected)

    assertEquals(listOf(newer, corrected), outbox.records())
  }

  @Test
  fun deletingClearingAndDocumentsBehaveLikeIos() {
    val outbox = outbox()
    val kept = manualRecord(merchant = "Zostaje")
    val removed = manualRecord(merchant = "Znika")
    outbox.save(kept)
    outbox.save(removed)
    outbox.writeDocument("events", "[]")

    assertEquals(1, outbox.delete(removed.id))
    assertEquals(0, outbox.delete(removed.id))
    assertEquals(listOf(kept), outbox.records())

    outbox.deleteDocument("events")
    assertNull(outbox.readDocument("events"))

    outbox.writeDocument("events", "[]")
    outbox.clear()
    assertEquals(emptyList<NormalizedRecord>(), outbox.records())
    assertNull(outbox.readDocument("events"))
  }

  @Test
  fun theSyntheticMillenniumSampleIsIngestedAndRemovable() {
    val outbox = outbox()
    val manual = manualRecord(merchant = SyntheticSample.MERCHANT)
    outbox.save(manual)

    val outcome = outbox.ingest(
      subtitle = SyntheticSample.millennium.subtitle,
      body = SyntheticSample.millennium.body,
      sourceApp = SyntheticSample.SOURCE_APP
    )
    val wallet = outbox.ingest(
      subtitle = SyntheticSample.applePay.subtitle,
      body = SyntheticSample.applePay.body,
      sourceApp = SyntheticSample.SOURCE_APP
    )

    val record = (outcome as NormalizationOutcome.Record).record
    assertEquals("millennium", record.bank)
    assertEquals("expense", record.direction)
    assertEquals("cardPayment", record.transactionType)
    assertEquals(1234L, record.amountMinor)
    assertEquals("PLN", record.currency)
    assertEquals(SyntheticSample.MERCHANT, record.merchant)
    assertEquals(NormalizedRecordOrigin.CAPTURE, record.origin)
    assertEquals(SyntheticSample.MERCHANT, (wallet as NormalizationOutcome.Record).record.merchant)
    assertEquals(3, outbox.records().size)

    assertEquals(2, outbox.deleteSyntheticRecords())
    assertEquals(listOf(manual), outbox.records())
  }

  @Test
  fun diagnosticsReportTheCipherAndThePath() {
    val diagnostics = outbox().diagnostics()

    assertTrue(diagnostics.getValue("cipherVersion").startsWith("4.10.0"))
    assertEquals(configuration.databaseFile.absolutePath, diagnostics["databasePath"])
    assertEquals(setOf("cipherVersion", "databasePath"), diagnostics.keys)
  }

  private fun outbox() = EncryptedOutbox(context, configuration).also { outboxes.add(it) }

  private fun manualRecord(merchant: String, capturedAt: String = "2026-10-15T12:00:00Z") = NormalizedRecord(
    id = UUID.randomUUID().toString(),
    bank = "manual",
    direction = "expense",
    transactionType = null,
    amountMinor = 4200,
    currency = "PLN",
    merchant = merchant,
    accountName = null,
    occurredAt = capturedAt,
    capturedAt = capturedAt,
    sourceApp = "",
    status = "posted",
    origin = NormalizedRecordOrigin.MANUAL
  )

  private fun assertNoPlaintext(moment: String) {
    val files = directory.listFiles().orEmpty().filter { it.isFile }
    val markers = listOf("Kawiarnia Jawna", "Dokument Jawny", "SQLite format 3", "outbox", "documents")

    assertTrue("The database file is missing $moment", files.any { it.name == configuration.databaseFile.name })

    for (file in files) {
      val content = file.readBytes()
      for (marker in markers) {
        assertFalse("${file.name} contains \"$marker\" $moment", content.contains(marker.toByteArray(Charsets.UTF_8)))
      }
    }
  }

  private fun ByteArray.contains(needle: ByteArray): Boolean =
    needle.isNotEmpty() && (0..size - needle.size).any { start -> needle.indices.all { this[start + it] == needle[it] } }
}
