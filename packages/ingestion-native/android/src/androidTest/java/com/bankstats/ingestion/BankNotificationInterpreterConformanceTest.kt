package com.bankstats.ingestion

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

@RunWith(AndroidJUnit4::class)
class BankNotificationInterpreterConformanceTest {
  private val context = InstrumentationRegistry.getInstrumentation().targetContext

  @Test
  fun everySharedExampleProducesTheExpectedOutcome() {
    val interpreter = BundledBankNotificationRules.interpreter(context)
    val file = JSONObject(context.assets.open("bank-notification-examples.json").bufferedReader().use { it.readText() })
    val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }
    val capturedAt = parser.parse(file.getString("capturedAt"))!!
    val examples = file.getJSONArray("examples")
    val failures = mutableListOf<String>()

    for (index in 0 until examples.length()) {
      val example = examples.getJSONObject(index)
      val input = example.getJSONObject("input")
      val outcome = interpreter.normalize(
        title = input.getString("title"),
        subtitle = input.getString("subtitle"),
        body = input.getString("body"),
        sourceApp = input.getString("sourceApp"),
        capturedAt = capturedAt
      )
      val expected = jsonMap(example.getJSONObject("expected"))
      val actual = when (outcome) {
        is NormalizationOutcome.Record -> mapOf(
          "outcome" to "record",
          "record" to outcome.record.toMap().filterKeys { it != "id" && it != "origin" }
        )
        is NormalizationOutcome.Ignored -> mapOf("outcome" to "ignored", "reason" to outcome.reasonCode)
      }

      if (actual != expected) {
        failures.add("${example.getString("name")}\n  expected: $expected\n  actual:   $actual")
      }
    }

    assertEquals(failures.joinToString("\n"), 0, failures.size)
    assertEquals(true, examples.length() > 0)
  }

  private fun jsonMap(json: JSONObject): Map<String, Any> =
    json.keys().asSequence().associateWith { key ->
      when (val value = json.get(key)) {
        is JSONObject -> jsonMap(value)
        is Int -> value.toLong()
        else -> value
      }
    }
}
