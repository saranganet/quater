/**
 * Utility functions to format dates to Day-Month-Year (DD-MM-YYYY)
 * for all WhatsApp messages and notifications.
 */

/**
 * Formats a date string or Date object into DD-MM-YYYY (e.g. 14-10-2026).
 * If the input is null, undefined, or empty, returns an empty string or fallback.
 */
export function formatDateDMY(
  dateInput: string | Date | null | undefined,
  fallback: string = ""
): string {
  if (!dateInput) return fallback;

  if (typeof dateInput === "object" && dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return fallback;
    const day = String(dateInput.getDate()).padStart(2, "0");
    const month = String(dateInput.getMonth() + 1).padStart(2, "0");
    const year = dateInput.getFullYear();
    return `${day}-${month}-${year}`;
  }

  const str = String(dateInput).trim();
  if (!str) return fallback;

  // Already DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str;
  }

  // DD/MM/YYYY -> DD-MM-YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str.replace(/\//g, "-");
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, "0");
    const day = ymdMatch[3].padStart(2, "0");
    return `${day}-${month}-${year}`;
  }

  // Try parsing generic ISO / date strings
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return str;
}

/**
 * Replaces any embedded YYYY-MM-DD dates within a string to DD-MM-YYYY.
 * e.g. "Hearing on 2026-10-14" -> "Hearing on 14-10-2026"
 */
export function formatDatesInText(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_match, y, m, d) => `${d}-${m}-${y}`);
}
