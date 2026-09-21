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

  func normalized() -> NormalizedRecord {
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
      category: category
    )
  }
}
