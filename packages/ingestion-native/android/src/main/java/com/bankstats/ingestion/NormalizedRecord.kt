package com.bankstats.ingestion

import org.json.JSONObject

object NormalizedRecordOrigin {
  const val CAPTURE = "capture"
  const val MANUAL = "manual"
}

object ReviewReason {
  const val CURRENCY = "currency"
}

data class NormalizedRecord(
  val id: String,
  val bank: String,
  val direction: String,
  val transactionType: String?,
  val amountMinor: Long,
  val currency: String,
  val merchant: String?,
  val accountName: String?,
  val occurredAt: String,
  val capturedAt: String,
  val sourceApp: String,
  val status: String,
  val origin: String? = null,
  val review: String? = null,
  val category: String? = null,
  val accountId: String? = null,
  val eventId: String? = null,
  val reportingAmountMinor: Long? = null,
  val exchangeRate: String? = null,
  val exchangeRateDate: String? = null,
  val exchangeRateTable: String? = null
) {
  fun toMap(): Map<String, Any> {
    val value = linkedMapOf<String, Any>(
      "id" to id,
      "bank" to bank,
      "direction" to direction,
      "amountMinor" to amountMinor,
      "currency" to currency,
      "occurredAt" to occurredAt,
      "capturedAt" to capturedAt,
      "sourceApp" to sourceApp,
      "status" to status,
      "origin" to (origin ?: NormalizedRecordOrigin.CAPTURE)
    )
    optionalFields().forEach { (key, field) -> field?.let { value[key] = it } }
    return value
  }

  fun toJson(): String {
    val json = JSONObject()
      .put("id", id)
      .put("bank", bank)
      .put("direction", direction)
      .put("amountMinor", amountMinor)
      .put("currency", currency)
      .put("occurredAt", occurredAt)
      .put("capturedAt", capturedAt)
      .put("sourceApp", sourceApp)
      .put("status", status)
    origin?.let { json.put("origin", it) }
    optionalFields().forEach { (key, field) -> field?.let { json.put(key, it) } }
    return json.toString()
  }

  private fun optionalFields(): List<Pair<String, Any?>> = listOf(
    "transactionType" to transactionType,
    "merchant" to merchant,
    "accountName" to accountName,
    "review" to review,
    "category" to category,
    "accountId" to accountId,
    "eventId" to eventId,
    "reportingAmountMinor" to reportingAmountMinor,
    "exchangeRate" to exchangeRate,
    "exchangeRateDate" to exchangeRateDate,
    "exchangeRateTable" to exchangeRateTable
  )

  companion object {
    fun fromJson(value: String): NormalizedRecord {
      val json = JSONObject(value)
      return NormalizedRecord(
        id = json.getString("id"),
        bank = json.getString("bank"),
        direction = json.getString("direction"),
        transactionType = json.optionalString("transactionType"),
        amountMinor = json.getLong("amountMinor"),
        currency = json.getString("currency"),
        merchant = json.optionalString("merchant"),
        accountName = json.optionalString("accountName"),
        occurredAt = json.getString("occurredAt"),
        capturedAt = json.getString("capturedAt"),
        sourceApp = json.getString("sourceApp"),
        status = json.getString("status"),
        origin = json.optionalString("origin"),
        review = json.optionalString("review"),
        category = json.optionalString("category"),
        accountId = json.optionalString("accountId"),
        eventId = json.optionalString("eventId"),
        reportingAmountMinor = if (json.isNull("reportingAmountMinor")) null else json.getLong("reportingAmountMinor"),
        exchangeRate = json.optionalString("exchangeRate"),
        exchangeRateDate = json.optionalString("exchangeRateDate"),
        exchangeRateTable = json.optionalString("exchangeRateTable")
      )
    }

    private fun JSONObject.optionalString(key: String): String? =
      if (isNull(key)) null else getString(key)
  }
}

sealed class NormalizationOutcome {
  data class Record(val record: NormalizedRecord) : NormalizationOutcome()
  data class Ignored(val reasonCode: String) : NormalizationOutcome()
}
