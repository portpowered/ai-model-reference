/** Parses YYYY-MM-DD calendar dates as UTC noon to avoid local timezone drift. */
export function parseCalendarDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthIndex) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  return new Date(Date.UTC(year, monthIndex, day, 12));
}

export function formatCalendarMonthYear(value: string, locale = "en"): string {
  const date = parseCalendarDate(value);
  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
