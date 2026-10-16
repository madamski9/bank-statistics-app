package com.bankstats.ingestion

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import java.util.Date

@RunWith(AndroidJUnit4::class)
class BankNotificationOccurrenceTest {
  private val interpreter =
    BundledBankNotificationRules.interpreter(InstrumentationRegistry.getInstrumentation().targetContext)

  @Test
  fun aRepeatedAutumnHourResolvesToItsFirstOccurrenceLikeIos() {
    assertEquals("2026-10-25T00:30:00Z", occurredAt("2026-10-25 02:30:00"))
  }

  @Test
  fun theHourAfterTheRepeatedOneKeepsItsOnlyOccurrence() {
    assertEquals("2026-10-25T02:30:00Z", occurredAt("2026-10-25 03:30:00"))
  }

  @Test
  fun anOrdinaryTimeUsesTheWarsawOffset() {
    assertEquals("2026-07-01T10:15:00Z", occurredAt("2026-07-01 12:15:00"))
  }

  @Test
  fun aTimeSkippedInSpringIsNotATransaction() {
    assertEquals(NormalizationOutcome.Ignored("notTransaction"), outcome("2026-03-29 02:30:00"))
  }

  private fun occurredAt(date: String): String =
    (outcome(date) as NormalizationOutcome.Record).record.occurredAt

  private fun outcome(date: String) = interpreter.normalize(
    title = "",
    subtitle = "",
    body = "Otrzymano przelew na numer telefonu\nData: $date\nKwota: 30,00 PLN",
    sourceApp = "pl.pkobp.iko",
    capturedAt = Date(0)
  )
}
