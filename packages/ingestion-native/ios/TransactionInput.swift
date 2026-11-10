import ExpoModulesCore

struct TransactionInput: Record {
  @Field var id: String = ""
  @Field var bank: String = NormalizedRecordOrigin.manual
  @Field var direction: String = "expense"
  @Field var transactionType: String?
  @Field var amountMinor: Int = 0
  @Field var currency: String = "PLN"
  @Field var merchant: String?
  @Field var accountName: String?
  @Field var occurredAt: String = ""
  @Field var capturedAt: String = ""
  @Field var sourceApp: String = ""
  @Field var status: String = "posted"
  @Field var origin: String = NormalizedRecordOrigin.manual
  @Field var review: String?
  @Field var category: String?
  @Field var accountId: String?
  @Field var eventId: String?
  @Field var reportingAmountMinor: Int?
  @Field var exchangeRate: String?
  @Field var exchangeRateDate: String?
  @Field var exchangeRateTable: String?
  @Field var notificationTitle: String?
  @Field var bankName: String?
  @Field var walletPairing: String?

  func normalized() throws -> NormalizedRecord {
    guard amountMinor > 0,
      direction == "expense" || direction == "income",
      currency.range(of: "^[A-Z]{3}$", options: .regularExpression) != nil else {
      throw IngestionError.invalidRecord
    }

    let timestamp = ISO8601DateFormatter().string(from: Date())

    return NormalizedRecord(
      id: id.isEmpty ? UUID().uuidString.lowercased() : id,
      bank: bank,
      direction: direction,
      transactionType: transactionType,
      amountMinor: amountMinor,
      currency: currency,
      merchant: merchant,
      accountName: accountName,
      occurredAt: occurredAt.isEmpty ? timestamp : occurredAt,
      capturedAt: capturedAt.isEmpty ? timestamp : capturedAt,
      sourceApp: sourceApp,
      status: status,
      origin: origin,
      review: review,
      category: category,
      accountId: accountId,
      eventId: eventId,
      reportingAmountMinor: reportingAmountMinor,
      exchangeRate: exchangeRate,
      exchangeRateDate: exchangeRateDate,
      exchangeRateTable: exchangeRateTable,
      notificationTitle: notificationTitle,
      bankName: bankName,
      walletPairing: walletPairing == CardPaymentPairing.declinedWalletPairing ? walletPairing : nil
    )
  }
}
