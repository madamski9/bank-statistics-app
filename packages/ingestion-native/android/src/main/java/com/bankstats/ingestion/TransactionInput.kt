package com.bankstats.ingestion

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.util.Date
import java.util.Locale
import java.util.UUID

class TransactionInput : Record {
  @Field val id: String = ""
  @Field val bank: String = NormalizedRecordOrigin.MANUAL
  @Field val direction: String = "expense"
  @Field val transactionType: String? = null
  @Field val amountMinor: Long = 0
  @Field val currency: String = "PLN"
  @Field val merchant: String? = null
  @Field val accountName: String? = null
  @Field val occurredAt: String = ""
  @Field val capturedAt: String = ""
  @Field val sourceApp: String = ""
  @Field val status: String = "posted"
  @Field val origin: String = NormalizedRecordOrigin.MANUAL
  @Field val review: String? = null
  @Field val category: String? = null
  @Field val accountId: String? = null
  @Field val eventId: String? = null
  @Field val reportingAmountMinor: Long? = null
  @Field val exchangeRate: String? = null
  @Field val exchangeRateDate: String? = null
  @Field val exchangeRateTable: String? = null

  fun normalized(): NormalizedRecord {
    if (amountMinor <= 0 || (direction != "expense" && direction != "income") || !currencyCode.matches(currency)) {
      throw IngestionException.InvalidRecord()
    }

    val timestamp = BankNotificationInterpreter.isoTimestamp(Date())

    return NormalizedRecord(
      id = id.ifEmpty { UUID.randomUUID().toString().lowercase(Locale.ROOT) },
      bank = bank,
      direction = direction,
      transactionType = transactionType,
      amountMinor = amountMinor,
      currency = currency,
      merchant = merchant,
      accountName = accountName,
      occurredAt = occurredAt.ifEmpty { timestamp },
      capturedAt = capturedAt.ifEmpty { timestamp },
      sourceApp = sourceApp,
      status = status,
      origin = origin,
      review = review,
      category = category,
      accountId = accountId,
      eventId = eventId,
      reportingAmountMinor = reportingAmountMinor,
      exchangeRate = exchangeRate,
      exchangeRateDate = exchangeRateDate,
      exchangeRateTable = exchangeRateTable
    )
  }

  private companion object {
    val currencyCode = Regex("^[A-Z]{3}$")
  }
}
