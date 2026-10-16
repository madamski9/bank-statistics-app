package com.bankstats.ingestion

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.GregorianCalendar
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import java.util.regex.Matcher
import java.util.regex.Pattern

class RuleBundleException(message: String) : Exception(message)

class BankNotificationInterpreter(val bundle: BankNotificationRuleBundle) {
  private class CompiledPattern(val expression: Pattern, val groupNames: Set<String>)

  private val patterns = mutableMapOf<String, CompiledPattern>()

  val version: Int
    get() = bundle.version

  init {
    if (bundle.schemaVersion != SUPPORTED_SCHEMA_VERSION) {
      throw RuleBundleException("Unsupported rule schema version ${bundle.schemaVersion}")
    }

    for (rule in bundle.rules) {
      compile(rule.match.pattern)
      rule.requires?.title?.let { compile(it) }
      rule.record?.let { template ->
        listOfNotNull(template.bank, template.direction, template.transactionType)
          .filterIsInstance<MappedValue.FieldMatch>()
          .forEach { compile(it.pattern) }
      }
    }

    compile(bundle.merchantLocationSuffix)
  }

  fun normalize(
    title: String,
    subtitle: String,
    body: String,
    sourceApp: String,
    capturedAt: Date
  ): NormalizationOutcome {
    for (rule in bundle.rules) {
      val fields = mapOf(
        NotificationField.TITLE to collapseWhitespace(title, rule.whitespace),
        NotificationField.SUBTITLE to collapseWhitespace(subtitle, rule.whitespace),
        NotificationField.BODY to collapseWhitespace(body, rule.whitespace)
      )

      if (!meetsRequirements(rule, fields)) {
        continue
      }

      val groups = match(rule.match.pattern, fields.getValue(rule.match.field)) ?: continue

      rule.ignore?.let { return NormalizationOutcome.Ignored(it) }

      record(rule, groups, fields, sourceApp, capturedAt)?.let { return NormalizationOutcome.Record(it) }
    }

    return NormalizationOutcome.Ignored(bundle.fallbackIgnoreReason)
  }

  private fun meetsRequirements(rule: NotificationRule, fields: Map<NotificationField, String>): Boolean {
    val title = rule.requires?.title

    if (title != null && match(title, fields.getValue(NotificationField.TITLE)) == null) {
      return false
    }

    return when (rule.requires?.subtitle) {
      "empty" -> fields.getValue(NotificationField.SUBTITLE).isEmpty()
      "present" -> fields.getValue(NotificationField.SUBTITLE).isNotEmpty()
      else -> true
    }
  }

  private fun record(
    rule: NotificationRule,
    groups: Map<String, String>,
    fields: Map<NotificationField, String>,
    sourceApp: String,
    capturedAt: Date
  ): NormalizedRecord? {
    val template = rule.record ?: return null
    val amountMinor = NotificationAmount.minorUnits(groups[template.amountGroup] ?: "") ?: return null

    if (amountMinor <= 0) {
      return null
    }

    var occurredAt = capturedAt

    template.occurredAt?.let { source ->
      val value = groups[source.group] ?: return null
      occurredAt = parseOccurrence(value, source) ?: return null
    }

    val currencyValue = template.currencyGroups.asSequence().mapNotNull { groups[it] }.firstOrNull { it.isNotEmpty() }
    val currency = currencyValue?.let { currencyCode(it) }
    val merchant = template.merchant?.let { source ->
      val raw = source.group?.let { groups[it] ?: "" } ?: source.field?.let { fields.getValue(it) } ?: ""
      val cleaned = if (source.stripLocation) merchantName(raw) else raw.trim()
      cleaned.ifEmpty { null }
    }
    val account = template.accountGroup?.let { groups[it] }?.trim()

    return NormalizedRecord(
      id = UUID.randomUUID().toString().lowercase(Locale.ROOT),
      bank = mapped(template.bank, groups, fields),
      direction = mapped(template.direction, groups, fields),
      transactionType = template.transactionType?.let { mapped(it, groups, fields) },
      amountMinor = amountMinor,
      currency = currency ?: bundle.fallbackCurrency,
      merchant = merchant,
      accountName = account?.ifEmpty { null },
      occurredAt = isoTimestamp(occurredAt),
      capturedAt = isoTimestamp(capturedAt),
      sourceApp = template.sourceApp ?: sourceApp,
      status = template.status,
      origin = NormalizedRecordOrigin.CAPTURE,
      review = if (currency == null) ReviewReason.CURRENCY else null
    )
  }

  private fun mapped(value: MappedValue, groups: Map<String, String>, fields: Map<NotificationField, String>): String =
    when (value) {
      is MappedValue.Constant -> value.value
      is MappedValue.Group -> value.cases[(groups[value.name] ?: "").lowercase(Locale.ROOT)] ?: value.otherwise
      is MappedValue.FieldMatch ->
        if (match(value.pattern, fields.getValue(value.field)) != null) value.whenMatched else value.otherwise
    }

  private fun currencyCode(symbol: String): String? {
    bundle.currencySymbols[symbol.lowercase(Locale.ROOT)]?.let { return it }

    val code = symbol.uppercase(Locale.ROOT)
    return if (threeLetterCode.matcher(code).find()) code else null
  }

  private fun merchantName(value: String): String {
    val trimmed = value.trim()
    val suffix = bundle.merchantLocationSuffix
    val separator = trimmed.indexOf("  ")

    if (separator != -1) {
      val name = trimmed.substring(0, separator).trim()

      if (name.isNotEmpty() && firstMatch(suffix, trimmed.substring(separator)) != null) {
        return name
      }
    }

    val match = firstMatch(suffix, trimmed) ?: return trimmed

    if (match.start() == 0) {
      return trimmed
    }

    return trimmed.substring(0, match.start()).trim()
  }

  private fun firstMatch(pattern: RulePattern, text: String): Matcher? {
    val matcher = compiled(pattern).expression.matcher(text)
    return if (matcher.find()) matcher else null
  }

  private fun match(pattern: RulePattern, text: String): Map<String, String>? {
    val compiled = compiled(pattern)
    val matcher = compiled.expression.matcher(text)

    if (!matcher.find()) {
      return null
    }

    return compiled.groupNames.mapNotNull { name -> matcher.group(name)?.let { name to it } }.toMap()
  }

  private fun compiled(pattern: RulePattern): CompiledPattern =
    patterns[key(pattern)] ?: throw RuleBundleException("Pattern was not compiled: ${pattern.pattern}")

  private fun compile(pattern: RulePattern) {
    val key = key(pattern)

    if (patterns.containsKey(key)) {
      return
    }

    val expanded = expand(pattern.pattern)
    val flags = if (pattern.caseInsensitive) Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE else 0
    val expression = try {
      Pattern.compile(expanded, flags)
    } catch (error: Exception) {
      throw RuleBundleException("Invalid pattern ${pattern.pattern}")
    }
    patterns[key] = CompiledPattern(expression, groupNamePattern.findAll(expanded).map { it.groupValues[1] }.toSet())
  }

  private fun expand(pattern: String): String =
    fragmentPlaceholder.replace(pattern) { placeholder ->
      val name = placeholder.groupValues[1]
      bundle.fragments[name] ?: throw RuleBundleException("Unknown rule fragment $name")
    }

  private fun key(pattern: RulePattern) = "${if (pattern.caseInsensitive) "i" else ""}:${pattern.pattern}"

  companion object {
    const val SUPPORTED_SCHEMA_VERSION = 1

    private const val DAY_MILLIS = 24L * 60 * 60 * 1000

    private val fragmentPlaceholder = Regex("\\{\\{(\\w+)\\}\\}")
    private val groupNamePattern = Regex("\\(\\?<([A-Za-z][A-Za-z0-9]*)>")
    private val formatTokenPattern = Regex("yyyy|MM|dd|HH|mm|ss")
    private val threeLetterCode = Pattern.compile("^[A-Z]{3}$")
    private val anyWhitespace = Regex("\\s+")
    private val nonSpaceWhitespace = Regex("[^\\S ]+")
    private val repeatedSpaces = Regex(" {2,}")

    fun collapseWhitespace(value: String, mode: WhitespaceMode): String =
      when (mode) {
        WhitespaceMode.SINGLE -> value.replace(anyWhitespace, " ").trim()
        WhitespaceMode.KEEP_DOUBLE_SPACE ->
          value.replace(nonSpaceWhitespace, " ").replace(repeatedSpaces, "  ").trim()
      }

    fun isoTimestamp(date: Date): String {
      val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
      formatter.timeZone = TimeZone.getTimeZone("UTC")
      return formatter.format(date)
    }

    private fun parseOccurrence(value: String, source: OccurrenceSource): Date? {
      if (!TimeZone.getAvailableIDs().contains(source.timeZone)) {
        return null
      }

      val timeZone = TimeZone.getTimeZone(source.timeZone)

      for (format in source.formats) {
        val components = localComponents(value, format) ?: continue
        val calendar = GregorianCalendar(timeZone, Locale.US)
        calendar.clear()
        calendar.set(
          components.getValue("yyyy"),
          components.getValue("MM") - 1,
          components.getValue("dd"),
          components.getValue("HH"),
          components.getValue("mm"),
          components.getValue("ss")
        )
        val instant = calendar.timeInMillis

        if (!showsLocalTime(instant, components, timeZone)) {
          continue
        }

        val repeatedHourShift = timeZone.getOffset(instant - DAY_MILLIS) - timeZone.getOffset(instant)
        val earlierInstant = instant - repeatedHourShift

        if (repeatedHourShift > 0 && showsLocalTime(earlierInstant, components, timeZone)) {
          return Date(earlierInstant)
        }

        return Date(instant)
      }

      return null
    }

    private fun showsLocalTime(instant: Long, components: Map<String, Int>, timeZone: TimeZone): Boolean {
      val calendar = GregorianCalendar(timeZone, Locale.US)
      calendar.timeInMillis = instant

      return calendar.get(Calendar.YEAR) == components.getValue("yyyy") &&
        calendar.get(Calendar.MONTH) == components.getValue("MM") - 1 &&
        calendar.get(Calendar.DAY_OF_MONTH) == components.getValue("dd") &&
        calendar.get(Calendar.HOUR_OF_DAY) == components.getValue("HH") &&
        calendar.get(Calendar.MINUTE) == components.getValue("mm") &&
        calendar.get(Calendar.SECOND) == components.getValue("ss")
    }

    private fun localComponents(value: String, format: String): Map<String, Int>? {
      val pattern = StringBuilder("^")
      val order = mutableListOf<String>()
      var cursor = 0

      for (token in formatTokenPattern.findAll(format)) {
        pattern.append(Pattern.quote(format.substring(cursor, token.range.first)))
        pattern.append(if (token.value == "yyyy") "([0-9]{4})" else "([0-9]{2})")
        order.add(token.value)
        cursor = token.range.last + 1
      }

      pattern.append(Pattern.quote(format.substring(cursor))).append("$")
      val matcher = Pattern.compile(pattern.toString()).matcher(value)

      if (!matcher.find()) {
        return null
      }

      val components = mutableMapOf("yyyy" to 0, "MM" to 1, "dd" to 1, "HH" to 0, "mm" to 0, "ss" to 0)

      order.forEachIndexed { index, name ->
        components[name] = matcher.group(index + 1)?.toIntOrNull() ?: return null
      }

      return components
    }
  }
}
