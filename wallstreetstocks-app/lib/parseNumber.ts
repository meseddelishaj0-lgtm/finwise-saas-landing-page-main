// Locale-safe parsing of user-entered numbers from `decimal-pad` inputs.
//
// The decimal-pad keyboard renders the DEVICE-LOCALE decimal separator — a
// comma in de/es/fr/it/pt/tr/el (all locales this app ships). Bare
// `parseFloat("12,50")` returns `12`, silently dropping the cents, which then
// corrupts cost basis / P&L and rejects fractional entries like "0,5". This
// normalizes both "1.234,56" (comma-decimal) and "1,234.56" (dot-decimal)
// styles before parsing.

export function parseLocaleNumber(
  input: string | number | null | undefined
): number {
  if (typeof input === 'number') return input;
  if (input == null) return NaN;

  // Strip whitespace (incl. NBSP/thin-space thousands) and currency symbols.
  let s = String(input).trim().replace(/[\s  $€£¥]/g, '');
  if (!s) return NaN;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    // Both present: whichever appears LAST is the decimal separator; the other
    // is a thousands separator to be removed.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.'); // 1.234,56 -> 1234.56
    } else {
      s = s.replace(/,/g, ''); // 1,234.56 -> 1234.56
    }
  } else if (hasComma) {
    // Only comma(s): the last comma is the decimal separator; any earlier
    // commas are thousands separators. "12,50" -> "12.50", "1,234,56" ->
    // "1234.56".
    const parts = s.split(',');
    const dec = parts.pop() ?? '';
    s = parts.join('') + '.' + dec;
  }
  // else: only dots or plain digits — parseFloat handles it directly.

  return parseFloat(s);
}
