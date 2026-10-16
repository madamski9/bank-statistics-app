package com.bankstats.ingestion

import org.json.JSONArray
import org.json.JSONObject

data class RulePattern(val pattern: String, val caseInsensitive: Boolean)

enum class NotificationField(val key: String) {
  TITLE("title"),
  SUBTITLE("subtitle"),
  BODY("body");

  companion object {
    fun from(value: String): NotificationField =
      entries.firstOrNull { it.key == value } ?: throw IllegalArgumentException("Unknown field $value")
  }
}

enum class WhitespaceMode(val key: String) {
  SINGLE("single"),
  KEEP_DOUBLE_SPACE("keepDoubleSpace");

  companion object {
    fun from(value: String): WhitespaceMode =
      entries.firstOrNull { it.key == value } ?: throw IllegalArgumentException("Unknown whitespace mode $value")
  }
}

sealed class MappedValue {
  data class Constant(val value: String) : MappedValue()
  data class Group(val name: String, val cases: Map<String, String>, val otherwise: String) : MappedValue()
  data class FieldMatch(
    val field: NotificationField,
    val pattern: RulePattern,
    val whenMatched: String,
    val otherwise: String
  ) : MappedValue()
}

data class MerchantSource(val group: String?, val field: NotificationField?, val stripLocation: Boolean)

data class OccurrenceSource(val group: String, val formats: List<String>, val timeZone: String)

data class RecordTemplate(
  val bank: MappedValue,
  val sourceApp: String?,
  val direction: MappedValue,
  val transactionType: MappedValue?,
  val amountGroup: String,
  val currencyGroups: List<String>,
  val merchant: MerchantSource?,
  val accountGroup: String?,
  val occurredAt: OccurrenceSource?,
  val status: String
)

data class RuleRequirements(val subtitle: String?, val title: RulePattern?)

data class RuleMatch(val field: NotificationField, val pattern: RulePattern)

data class NotificationRule(
  val id: String,
  val whitespace: WhitespaceMode,
  val requires: RuleRequirements?,
  val match: RuleMatch,
  val ignore: String?,
  val record: RecordTemplate?
)

data class BankNotificationRuleBundle(
  val schemaVersion: Int,
  val version: Int,
  val fragments: Map<String, String>,
  val currencySymbols: Map<String, String>,
  val fallbackCurrency: String,
  val merchantLocationSuffix: RulePattern,
  val fallbackIgnoreReason: String,
  val rules: List<NotificationRule>
) {
  companion object {
    fun parse(source: String): BankNotificationRuleBundle {
      val json = JSONObject(source)
      return BankNotificationRuleBundle(
        schemaVersion = json.getInt("schemaVersion"),
        version = json.getInt("version"),
        fragments = json.getJSONObject("fragments").stringMap(),
        currencySymbols = json.getJSONObject("currencySymbols").stringMap(),
        fallbackCurrency = json.getString("fallbackCurrency"),
        merchantLocationSuffix = json.getJSONObject("merchantLocationSuffix").rulePattern(),
        fallbackIgnoreReason = json.getString("fallbackIgnoreReason"),
        rules = json.getJSONArray("rules").objects().map { it.rule() }
      )
    }

    private fun JSONObject.rule(): NotificationRule {
      val match = getJSONObject("match")
      return NotificationRule(
        id = getString("id"),
        whitespace = WhitespaceMode.from(getString("whitespace")),
        requires = optJSONObject("requires")?.let { requires ->
          RuleRequirements(
            subtitle = requires.optionalString("subtitle"),
            title = requires.optJSONObject("title")?.rulePattern()
          )
        },
        match = RuleMatch(NotificationField.from(match.getString("field")), match.rulePattern()),
        ignore = optionalString("ignore"),
        record = optJSONObject("record")?.recordTemplate()
      )
    }

    private fun JSONObject.recordTemplate(): RecordTemplate = RecordTemplate(
      bank = mappedValue(get("bank")),
      sourceApp = optionalString("sourceApp"),
      direction = mappedValue(get("direction")),
      transactionType = opt("transactionType")?.let { mappedValue(it) },
      amountGroup = getString("amountGroup"),
      currencyGroups = getJSONArray("currencyGroups").strings(),
      merchant = optJSONObject("merchant")?.let { merchant ->
        MerchantSource(
          group = merchant.optionalString("group"),
          field = merchant.optionalString("field")?.let { NotificationField.from(it) },
          stripLocation = merchant.optBoolean("stripLocation", false)
        )
      },
      accountGroup = optionalString("accountGroup"),
      occurredAt = optJSONObject("occurredAt")?.let { occurred ->
        OccurrenceSource(
          group = occurred.getString("group"),
          formats = occurred.getJSONArray("formats").strings(),
          timeZone = occurred.getString("timeZone")
        )
      },
      status = getString("status")
    )

    private fun mappedValue(value: Any): MappedValue {
      if (value is String) {
        return MappedValue.Constant(value)
      }

      val json = value as JSONObject
      val otherwise = json.getString("otherwise")
      val group = json.optionalString("group")

      if (group != null) {
        return MappedValue.Group(group, json.getJSONObject("cases").stringMap(), otherwise)
      }

      return MappedValue.FieldMatch(
        field = NotificationField.from(json.getString("field")),
        pattern = json.rulePattern(),
        whenMatched = json.getString("whenMatched"),
        otherwise = otherwise
      )
    }

    private fun JSONObject.rulePattern() = RulePattern(getString("pattern"), optBoolean("caseInsensitive", false))

    private fun JSONObject.optionalString(key: String): String? = if (isNull(key)) null else getString(key)

    private fun JSONObject.stringMap(): Map<String, String> =
      keys().asSequence().associateWith { getString(it) }

    private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map { getJSONObject(it) }

    private fun JSONArray.strings(): List<String> = (0 until length()).map { getString(it) }
  }
}
